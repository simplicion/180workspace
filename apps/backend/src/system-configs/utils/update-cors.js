const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://e3b69988b74e14bbf1fa537516999d99.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "d38671149584fab8e84ea6ae73c658cc",
    secretAccessKey: "c82805a4c17f64dba7d25291d7bbe796f126793fcb77051075d38e828e2ef89b",
  },
});

const run = async () => {
  try {
    const data = await r2Client.send(
      new PutBucketCorsCommand({
        Bucket: "ims-platform",
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600
            },
          ],
        },
      })
    );
    console.log("CORS updated successfully", data);
  } catch (err) {
    console.log("Error", err);
  }
};
run();
