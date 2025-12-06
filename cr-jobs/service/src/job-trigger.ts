import { spawn } from "node:child_process";
import { GoogleAuth } from "google-auth-library";

type JobTarget = {
  projectId: string;
  location: string;
  jobName: string;
};

const RUN_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function resolveJobTarget(): JobTarget {
  const projectId =
    process.env.JOB_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.JOB_LOCATION ?? process.env.REGION;
  const jobName = process.env.JOB_NAME;

  if (!projectId || !location || !jobName) {
    const missing = [];
    if (!projectId) missing.push("JOB_PROJECT_ID (or GCLOUD_PROJECT)");
    if (!location) missing.push("JOB_LOCATION (or REGION)");
    if (!jobName) missing.push("JOB_NAME");
    throw new Error(
      `[JobTrigger] Missing required env: ${missing.join(
        ", ",
      )}. Set them so the Cloud Run Job can be triggered.`,
    );
  }

  return { projectId, location, jobName };
}

async function runRemoteJob(offerId: string): Promise<void> {
  const { projectId, location, jobName } = resolveJobTarget();
  const url = `https://run.googleapis.com/v2/projects/${projectId}/locations/${location}/jobs/${jobName}:run`;

  const auth = new GoogleAuth({ scopes: RUN_SCOPE });
  const client = await auth.getClient();

  const body = {
    overrides: {
      containerOverrides: [
        {
          env: [{ name: "OFFER_ID", value: offerId }],
        },
      ],
    },
  };

  try {
    const res = await client.request<{ name?: string }>({
      url,
      method: "POST",
      data: body,
    });
    const executionName = res.data.name ?? "(execution name unavailable)";
    console.log(
      `[JobTrigger] Triggered Cloud Run Job ${jobName} in ${location} for offer ${offerId}. Execution=${executionName}`,
    );
  } catch (error) {
    console.error("[JobTrigger] Failed to trigger Cloud Run Job", error);
    throw error;
  }
}

/**
 * Spawn the sibling job package locally for dev. Fire-and-forget so the
 * service can immediately start waiting for the Firestore answer, but still
 * surface spawn errors.
 */
function runLocalJob(offerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "--filter",
        "@cloud-run-webrtc-peering-jobs/job",
        "start",
        "--offerId",
        offerId,
      ],
      {
        stdio: "inherit",
        env: { ...process.env, OFFER_ID: offerId },
      },
    );

    child.once("spawn", resolve);
    child.on("error", (error) => {
      console.error("[JobTrigger] Failed to spawn local job", error);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      console.log(
        `[JobTrigger] Local job exited code=${code} signal=${signal ?? "none"}`,
      );
    });
  });
}

/**
 * Minimal job trigger.
 * In real Cloud Run, call the Jobs API with OFFER_ID env passed to the job task.
 * For local testing, set AUTO_RUN_LOCAL_JOB=true to spawn the sibling job package.
 */
export async function triggerJob(offerId: string): Promise<void> {
  if (process.env.AUTO_RUN_LOCAL_JOB !== "true") {
    await runRemoteJob(offerId);
    return;
  }

  await runLocalJob(offerId);
}
