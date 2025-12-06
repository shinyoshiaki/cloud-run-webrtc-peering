import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

// 設定の取得
const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.require("region");
const serviceImage = config.require("serviceImage");
const jobImage = config.require("jobImage");

// ベース名
const baseName = "webrtc-peering-jobs";
const serviceName = `${baseName}-service`;
const jobName = `${baseName}-job`;

// =============================================================================
// VPC ネットワークとサブネット
// =============================================================================
const vpcNetwork = new gcp.compute.Network(`${baseName}-vpc`, {
  name: `${baseName}-vpc`,
  project,
  autoCreateSubnetworks: false,
  description: "VPC network for Cloud Run Jobs sample",
});

const subnet = new gcp.compute.Subnetwork(`${baseName}-subnet`, {
  name: `${baseName}-subnet`,
  project,
  region,
  network: vpcNetwork.id,
  ipCidrRange: "10.1.0.0/24",
  privateIpGoogleAccess: true,
  description: "Subnet for Cloud Run Jobs sample",
});

// =============================================================================
// Cloud Router & NAT
// =============================================================================
const cloudRouter = new gcp.compute.Router(`${baseName}-router`, {
  name: `${baseName}-router`,
  project,
  region,
  network: vpcNetwork.id,
  description: "Cloud Router for Cloud Run Jobs NAT",
});

const cloudNat = new gcp.compute.RouterNat(`${baseName}-nat`, {
  name: `${baseName}-nat`,
  project,
  region,
  router: cloudRouter.name,
  natIpAllocateOption: "AUTO_ONLY",
  sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES",
  logConfig: {
    enable: true,
    filter: "ERRORS_ONLY",
  },
});

// =============================================================================
// サービスアカウントと IAM
// =============================================================================
const serviceAccount = new gcp.serviceaccount.Account(`${baseName}-sa`, {
  accountId: `${baseName}-sa`,
  displayName: "Cloud Run Jobs sample service account",
  description: "Used by both Cloud Run Service and Job",
});

// Firestore 読み書き
const firestoreDataUser = new gcp.projects.IAMMember(
  `${baseName}-firestore-data-user`,
  {
    project,
    role: "roles/datastore.user",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  },
);

// ジョブ実行 API を呼ぶためのロール
const runDeveloper = new gcp.projects.IAMMember(`${baseName}-run-developer`, {
  project,
  role: "roles/run.developer",
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// =============================================================================
// Firestore データベース
// =============================================================================
// const firestoreDatabase = new gcp.firestore.Database(`${baseName}-db`, {
//   name: "(default)",
//   project,
//   locationId: region,
//   type: "FIRESTORE_NATIVE",
//   deleteProtectionState: "DELETE_PROTECTION_DISABLED",
//   deletionPolicy: "DELETE",
// });

// =============================================================================
// Cloud Run Job
// =============================================================================
const cloudRunJob = new gcp.cloudrunv2.Job(
  jobName,
  {
    name: jobName,
    location: region,
    deletionProtection: false,
    template: {
      taskCount: 1,
      parallelism: 1,
      template: {
        serviceAccount: serviceAccount.email,
        vpcAccess: {
          networkInterfaces: [
            {
              network: vpcNetwork.id,
              subnetwork: subnet.id,
            },
          ],
          egress: "ALL_TRAFFIC",
        },
        containers: [
          {
            image: jobImage,
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
          },
        ],
        maxRetries: 1,
        timeout: "600s",
      },
    },
  },
  {
    dependsOn: [
      // firestoreDatabase,
      firestoreDataUser,
      subnet,
      cloudNat,
    ],
  },
);

// =============================================================================
// Cloud Run Service
// =============================================================================
const cloudRunService = new gcp.cloudrunv2.Service(
  serviceName,
  {
    name: serviceName,
    location: region,
    ingress: "INGRESS_TRAFFIC_ALL",
    template: {
      serviceAccount: serviceAccount.email,
      containers: [
        {
          image: serviceImage,
          ports: {
            name: "http1",
            containerPort: 3000,
          },
          resources: {
            limits: {
              cpu: "1",
              memory: "512Mi",
            },
          },
          envs: [
            { name: "GCLOUD_PROJECT", value: project },
            { name: "REGION", value: region },
            { name: "JOB_PROJECT_ID", value: project },
            { name: "JOB_LOCATION", value: region },
            { name: "JOB_NAME", value: cloudRunJob.name },
          ],
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
    traffics: [
      {
        type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
        percent: 100,
      },
    ],
  },
  {
    dependsOn: [
      // firestoreDatabase,
      firestoreDataUser,
    ],
  },
);

// 公開アクセス
new gcp.cloudrunv2.ServiceIamMember(`${baseName}-invoker`, {
  project,
  location: region,
  name: cloudRunService.name,
  role: "roles/run.invoker",
  member: "allUsers",
});

// 出力
export const serviceAccountEmail = serviceAccount.email;
export const serviceUrl = cloudRunService.uri;
export const jobResourceName = cloudRunJob.name;
