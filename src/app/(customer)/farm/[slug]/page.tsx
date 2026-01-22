import { notFound } from "next/navigation";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import Link from "next/link";
import { ArrowLeft, Clock, Truck, MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFarmBySlug } from "@/lib/data/farms";
import { getProductsByFarmSlug } from "@/lib/data/products";
import { formatBadge, getBadgeColorClass } from "@/lib/data/farms";
import { FarmProductList } from "./farm-product-list";
import { getFarmFallbackImage } from "@/lib/utils/image-fallbacks";

export const revalidate = 60; // ISR

interface FarmProfilePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: FarmProfilePageProps) {
  const { slug } = await params;
  const farm = await getFarmBySlug(slug);

  if (!farm) {
    return {
      title: "Farm Not Found",
    };
  }

  return {
    title: farm.name,
    description: farm.short_description || `Shop premium meat from ${farm.name}`,
  };
}

export default async function FarmProfilePage({ params }: FarmProfilePageProps) {
  const { slug } = await params;
  const [farm, products] = await Promise.all([
    getFarmBySlug(slug),
    getProductsByFarmSlug(slug),
  ]);

  if (!farm) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden bg-muted">
        <ImageWithFallback
          src={farm.hero_image_url}
          fallbackSrc={getFarmFallbackImage()}
          alt={farm.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Back button */}
        <Link
          href="/"
          className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {/* Farm name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="container mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {farm.name}
            </h1>
            {farm.short_description && (
              <p className="mt-2 text-lg text-white/90 max-w-2xl">
                {farm.short_description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sidebar - Farm Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Key Details Card */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold">
                Delivery Information
              </h2>

              <div className="space-y-3 text-sm">
                {farm.delivery_days && farm.delivery_days.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Delivery Days</p>
                      <p className="text-muted-foreground">
                        {farm.delivery_days.join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                {farm.cutoff_time && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Order Cutoff</p>
                      <p className="text-muted-foreground">
                        {formatCutoffTime(farm.cutoff_time)} day before delivery
                      </p>
                    </div>
                  </div>
                )}

                {farm.postcode && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{farm.postcode}</p>
                    </div>
                  </div>
                )}

                {farm.delivery_fee !== null && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Delivery Fee</p>
                      <p className="text-muted-foreground">
                        £{(farm.delivery_fee / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {farm.min_order_value !== null && (
                  <div className="pt-3 border-t">
                    <p className="text-muted-foreground">
                      Minimum order: £{(farm.min_order_value / 100).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            {farm.badges && farm.badges.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-display text-lg font-semibold mb-4">
                  Quality Standards
                </h2>
                <div className="flex flex-wrap gap-2">
                  {farm.badges.map((badge) => (
                    <Badge
                      key={badge}
                      className={getBadgeColorClass(badge)}
                    >
                      {formatBadge(badge)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Story */}
            {(farm.story || farm.story_video_url) && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-display text-lg font-semibold mb-4">
                  Our Story
                </h2>
                {farm.story_video_url && (
                  <div className="mb-4">
                    <video
                      src={farm.story_video_url}
                      controls
                      className="w-full rounded-lg"
                      style={{ maxHeight: "400px" }}
                    />
                  </div>
                )}
                {farm.story && <FarmStory story={farm.story} />}
              </div>
            )}
          </div>

          {/* Main content - Products */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold">
                Products
              </h2>
              <p className="text-muted-foreground">
                {products.length} items available
              </p>
            </div>

            <FarmProductList farm={farm} products={products} />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCutoffTime(time: string): string {
  const [hours] = time.split(":");
  const hour = parseInt(hours, 10);
  
  if (hour < 12) {
    return `${hour}am`;
  } else if (hour === 12) {
    return "12pm";
  } else {
    return `${hour - 12}pm`;
  }
}

// Client component for the story with "Read more"
function FarmStory({ story }: { story: string }) {
  // For server component, just render the story
  // If we need interactivity, we'd make this a client component
  const paragraphs = story.split("\n\n").filter(Boolean);
  const isLong = paragraphs.length > 2 || story.length > 500;

  return (
    <div className="prose prose-sm prose-stone max-w-none">
      {paragraphs.slice(0, isLong ? 2 : undefined).map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p}
        </p>
      ))}
      {isLong && (
        <details className="group">
          <summary className="cursor-pointer text-primary hover:underline list-none">
            Read more
          </summary>
          {paragraphs.slice(2).map((p, i) => (
            <p key={i} className="text-muted-foreground mt-4">
              {p}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
