import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

interface CTASectionProps {
  title: string;
  description?: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  trustSignals?: string[];
  variant?: "default" | "dark" | "sky";
}

export function CTASection({
  title,
  description,
  primaryCTA,
  secondaryCTA,
  trustSignals,
  variant = "default",
}: CTASectionProps) {
  const variants = {
    default: "bg-white text-navy-900",
    dark: "bg-navy-900 text-white",
    sky: "bg-sky-50 text-navy-900",
  };

  const buttonVariants = {
    default: "primary" as const,
    dark: "secondary" as const,
    sky: "primary" as const,
  };

  return (
    <section className={`py-16 md:py-24 ${variants[variant]}`}>
      <Container>
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          {description && (
            <p className="text-lg text-navy-600 mb-8">{description}</p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={primaryCTA.href}>
              <Button size="lg" className="w-full sm:w-auto">
                {primaryCTA.text}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            {secondaryCTA && (
              <Link href={secondaryCTA.href}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {secondaryCTA.text}
                </Button>
              </Link>
            )}
          </div>

          {trustSignals && trustSignals.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-navy-500">
              {trustSignals.map((signal, index) => (
                <span key={index} className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {signal}
                </span>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
