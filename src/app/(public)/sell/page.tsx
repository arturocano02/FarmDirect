import Link from "next/link";
import { 
  Store, 
  Truck, 
  ArrowRight,
  CheckCircle,
  Users,
  BarChart3,
  Package
} from "lucide-react";

export const metadata = {
  title: "Sell on FairFarm | Start Your Farm Business",
  description: "Join FairFarm as a farm seller. Reach customers looking for premium local meat. Easy setup, powerful tools, fair pricing.",
};

const features = [
  {
    icon: Store,
    title: "Your Online Storefront",
    description: "Beautiful product listings, farm profile, and direct customer connections.",
  },
  {
    icon: Package,
    title: "Easy Order Management",
    description: "Track orders, update statuses, and manage your delivery schedule.",
  },
  {
    icon: BarChart3,
    title: "Business Insights",
    description: "See your sales, popular products, and customer trends at a glance.",
  },
  {
    icon: Truck,
    title: "Flexible Delivery",
    description: "Set your own delivery areas, days, and minimum order values.",
  },
];

const benefits = [
  "No monthly fees - only pay when you sell",
  "Keep control of your pricing and products",
  "Direct relationship with your customers",
  "Simple, fast setup process",
  "Dedicated farm support team",
  "Secure, reliable payments",
];

const testimonials = [
  {
    quote: "FairFarm transformed how we sell. Orders come in automatically and customers love the convenience.",
    author: "Sarah M.",
    farm: "Green Valley Farm",
  },
  {
    quote: "Finally a platform that understands small farms. Setup was easy and the support is excellent.",
    author: "James T.",
    farm: "Meadow Brook Farm",
  },
];

export default function SellPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-farm-700">FairFarm</span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              for Farms
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup?role=farm"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
            <Users className="h-4 w-4" />
            Join 100+ farms already selling on FairFarm
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Sell your farm products{" "}
            <span className="text-amber-600">directly to customers</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            FairFarm connects you with customers looking for premium, locally-sourced meat.
            No middlemen, no complicated setup—just you and your customers.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup?role=farm"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-lg bg-amber-600 px-8 text-base font-medium text-white hover:bg-amber-700 transition-colors"
            >
              Start Selling Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-lg border border-input bg-white px-8 text-base font-medium hover:bg-accent transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Everything you need to run your farm business
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powerful tools designed specifically for farm sellers
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-amber-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Why farms choose FairFarm
          </h2>
              <p className="mt-4 text-muted-foreground">
                We&apos;re building the future of local food. Here&apos;s why farmers love us:
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-farm-600 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?role=farm"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-farm-600 px-6 text-sm font-medium text-white hover:bg-farm-700 transition-colors"
              >
                Join FairFarm
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-square lg:aspect-auto lg:h-[500px]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-200 to-farm-200 opacity-20" />
              <div className="absolute inset-4 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center">
                <div className="text-center p-8">
                  <Store className="h-16 w-16 mx-auto text-amber-600 mb-4" />
                  <p className="text-lg font-medium text-amber-900">
                    Your farm storefront preview
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    Beautiful, mobile-friendly pages for your products
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Trusted by farms across the UK
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="rounded-xl bg-muted/30 p-6 md:p-8"
              >
                <blockquote className="text-lg">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-4">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.farm}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-amber-600 to-farm-600 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ready to grow your farm business?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join FairFarm today and start reaching new customers.
          </p>
          <Link
            href="/signup?role=farm"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-medium text-amber-700 hover:bg-white/90 transition-colors"
          >
            Create Your Farm Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FairFarm. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Browse Marketplace
              </Link>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Farm Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
