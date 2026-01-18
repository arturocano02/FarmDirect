import { Suspense } from "react";
import { CheckoutForm } from "./checkout-form";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Checkout | Farmlink",
  description: "Complete your order",
};

function CheckoutSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="section-heading mb-8">Checkout</h1>

      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
