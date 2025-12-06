import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

// 設定を取得
const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.require("region");
const dockerImage = config.require("dockerImage");

// サービス名
const serviceName = "webrtc-peering";

// =============================================================================
// VPC ネットワークの作成
// =============================================================================
const vpcNetwork = new gcp.compute.Network("webrtc-peering-vpc", {
  name: `${serviceName}-vpc`,
  project: project,
  autoCreateSubnetworks: false,
  description: "VPC network for WebRTC Peering Cloud Run service",
});

// サブネットの作成
const subnet = new gcp.compute.Subnetwork("webrtc-peering-subnet", {
  name: `${serviceName}-subnet`,
  project: project,
  region: region,
  network: vpcNetwork.id,
  ipCidrRange: "10.0.0.0/24",
  privateIpGoogleAccess: true,
  description: "Subnet for WebRTC Peering Cloud Run service",
});

// =============================================================================
// Cloud Router の作成（Cloud NAT用）
// =============================================================================
const cloudRouter = new gcp.compute.Router("webrtc-peering-router", {
  name: `${serviceName}-router`,
  project: project,
  region: region,
  network: vpcNetwork.id,
  description: "Cloud Router for WebRTC Peering NAT",
});

// =============================================================================
// Cloud NAT の作成（エフェメラルIP使用）
// =============================================================================
const cloudNat = new gcp.compute.RouterNat("webrtc-peering-nat", {
  name: `${serviceName}-nat`,
  project: project,
  region: region,
  router: cloudRouter.name,
  // エフェメラルIPを自動割り当て
  natIpAllocateOption: "AUTO_ONLY",
  // すべてのサブネットのプライマリIPレンジに適用
  sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES",
  // ログ設定（エラーのみ）
  logConfig: {
    enable: true,
    filter: "ERRORS_ONLY",
  },
});

// =============================================================================
// サービスアカウントの作成
// =============================================================================
const serviceAccount = new gcp.serviceaccount.Account("webrtc-peering-sa", {
  accountId: `${serviceName}-sa`,
  displayName: "WebRTC Peering Cloud Run Service Account",
  description:
    "Service account for Cloud Run WebRTC Peering application with Firestore access",
});

// =============================================================================
// サービスアカウントへの権限付与
// =============================================================================

// Firestore データユーザー権限（読み書き用）
// main.tsでFirestoreへの読み書きを行っているため必要
const firestoreDataUserBinding = new gcp.projects.IAMMember(
  "firestore-data-user",
  {
    project: project,
    role: "roles/datastore.user",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  },
);

// =============================================================================
// Firestore データベースの作成
// =============================================================================
const firestoreDatabase = new gcp.firestore.Database("webrtc-peering-db", {
  name: "(default)",
  project: project,
  locationId: region,
  type: "FIRESTORE_NATIVE",
  // 削除保護を無効化（開発環境用）
  deleteProtectionState: "DELETE_PROTECTION_DISABLED",
  // 削除ポリシー（Pulumiで管理）
  deletionPolicy: "DELETE",
});

// =============================================================================
// Cloud Run サービスの作成
// =============================================================================
const cloudRunService = new gcp.cloudrunv2.Service(
  "webrtc-peering-service",
  {
    name: serviceName,
    location: region,
    ingress: "INGRESS_TRAFFIC_ALL",
    template: {
      serviceAccount: serviceAccount.email,
      // Direct VPC Egress で外向き通信を行う設定
      vpcAccess: {
        // Direct VPC Egress を使用（connectorを指定しない）
        networkInterfaces: [
          {
            network: vpcNetwork.id,
            subnetwork: subnet.id,
          },
        ],
        // すべての外向きトラフィックをVPC経由にする
        egress: "ALL_TRAFFIC",
      },
      containers: [
        {
          image: dockerImage,
          ports: {
            containerPort: 3000,
            name: "http1",
          },
          resources: {
            limits: {
              cpu: "1",
              memory: "512Mi",
            },
          },
          envs: [
            {
              name: "GCLOUD_PROJECT",
              value: project,
            },
          ],
          // ヘルスチェック設定
          startupProbe: {
            httpGet: {
              path: "/health",
              port: 3000,
            },
            initialDelaySeconds: 0,
            periodSeconds: 10,
            failureThreshold: 3,
            timeoutSeconds: 5,
          },
          livenessProbe: {
            httpGet: {
              path: "/health",
              port: 3000,
            },
            periodSeconds: 30,
            failureThreshold: 3,
            timeoutSeconds: 5,
          },
        },
      ],
      scaling: {
        minInstanceCount: 0,
        maxInstanceCount: 2,
      },
    },
    // トラフィック設定
    traffics: [
      {
        type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
        percent: 100,
      },
    ],
  },
  {
    dependsOn: [firestoreDatabase, firestoreDataUserBinding, subnet, cloudNat],
  },
);

// =============================================================================
// Cloud Run への未認証アクセスを許可（公開API用）
// =============================================================================
new gcp.cloudrunv2.ServiceIamMember("webrtc-peering-invoker", {
  project: project,
  location: region,
  name: cloudRunService.name,
  role: "roles/run.invoker",
  member: "allUsers",
});

// =============================================================================
// 出力
// =============================================================================
export const serviceAccountEmail = serviceAccount.email;
export const firestoreDatabaseName = firestoreDatabase.name;
export const cloudRunUrl = cloudRunService.uri;
export const cloudRunServiceName = cloudRunService.name;
export const vpcNetworkName = vpcNetwork.name;
export const subnetName = subnet.name;
export const cloudNatName = cloudNat.name;
