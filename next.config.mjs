/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "@grpc/grpc-js",
    "google-gax",
  ],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/firebase-admin/**/*",
      "./node_modules/@google-cloud/firestore/**/*",
      "./node_modules/@grpc/grpc-js/**/*",
      "./node_modules/google-gax/**/*",
    ],
  },
};

export default nextConfig;
