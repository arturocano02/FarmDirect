import { Suspense } from "react";
import { SignupFlow } from "./signup-flow";

export const metadata = {
  title: "Sign Up | FairFarm",
  description: "Join FairFarm as a customer or farm seller",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96" />}>
      <SignupFlow />
    </Suspense>
  );
}
