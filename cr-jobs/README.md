# Cloud Run Jobs サンプル (ticket.md)

`cr-service` を参考に、Cloud Run Service / Cloud Run Job / Node.js クライアントをそれぞれ独立パッケージとして最小構成で実装しています。シグナリングは `ticket.md` の mermaid 図の通り Firestore 経由で行います。

ローカル開発向けに各 package.json のスクリプトへエミュレータ想定のデフォルト環境変数を追加しています（`FIRESTORE_EMULATOR_HOST=localhost:8080`, `GCLOUD_PROJECT=test-project` など）。必要に応じて上書きしてください。

```
Client --HTTP--> Cloud Run Service --trigger--> Cloud Run Job
   |                 |                           |
   |             Firestore (offers/answers) <----+
   +--------------------------P2P WebRTC--------------------------+
```

## パッケージ

- `cr-jobs/service` : クライアントから offer を受け取り Firestore に保存し、Cloud Run Job を起動するエントリポイント。answer が書き込まれるまでポーリングして返却します。
- `cr-jobs/job` : Firestore から offer を読み取り WebRTC answer を生成して Firestore に保存するジョブ。DataChannel で簡易エコーを行います。
- `cr-jobs/client` : `werift` を使った Node.js サンプルクライアント。offer を作成して service に送り、返ってきた answer を適用して P2P 接続します。

## 動かし方（ローカル最小例）

1. Firestore エミュレータ or 実プロジェクトを用意します（デフォルトはエミュレータ: `localhost:8080` & `test-project`）。別の環境を使う場合は各コマンド実行時に上書きしてください。
2. サービスを起動。ローカルでジョブも自動起動させたい場合は `dev:auto` を使います。
   ```bash
   # サービスのみ（デフォルトでエミュレータ接続）
   pnpm --filter @cloud-run-webrtc-peering-jobs/service dev

   # サービス + ジョブ自動起動（AUTO_RUN_LOCAL_JOB=true を自動セット）
   pnpm --filter @cloud-run-webrtc-peering-jobs/service dev:auto
   ```
3. 自動起動を使わない場合は、サービスが返した `offerId` を使ってジョブを手動起動します。
   ```bash
   pnpm --filter @cloud-run-webrtc-peering-jobs/job dev -- --offerId <offerId>
   # 本番相当で起動したい場合（環境変数を Cloud Run 側に渡す想定）
   OFFER_ID=<offerId> pnpm --filter @cloud-run-webrtc-peering-jobs/job start -- --offerId <offerId>
   ```
4. クライアントを実行して P2P チャネルを確認します。ローカル URL は `start:local` で自動指定できます。
   ```bash
   pnpm --filter @cloud-run-webrtc-peering-jobs/client start:local
   # 任意のサービス URL を使う場合
   SERVICE_URL=https://your-service.example pnpm --filter @cloud-run-webrtc-peering-jobs/client start
   ```

Cloud Run 本番では service から Cloud Run Jobs API を呼び出し、環境変数 `OFFER_ID` をジョブへ渡してください。
