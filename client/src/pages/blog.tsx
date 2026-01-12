import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";

export default function BlogPage() {
  const { data: blogPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const publishedPosts = blogPosts.filter(post => post.status === "published");

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Blog - Property Tips & News | Leaseo"
        description="Read the latest property rental tips, market insights, and real estate news from Leaseo. Stay informed about the Indian property market."
        keywords={["property blog", "real estate news", "rental tips", "property market", "India"]}
      />
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-b from-primary/5 to-transparent py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">Blog</h1>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto">
              Property tips, market insights, and helpful guides for renters and property owners
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : publishedPosts.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">No Blog Posts Yet</h2>
              <p className="text-muted-foreground">
                Check back soon for property tips and market insights.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="overflow-hidden group cursor-pointer hover-elevate active-elevate-2 transition-all duration-200 h-full" data-testid={`card-blog-${post.id}`}>
                    {post.featuredImage ? (
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-4xl text-primary/30 font-bold">
                          {post.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {post.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </CardTitle>
                      {post.excerpt && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : new Date(post.createdAt!).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                          Read more
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
