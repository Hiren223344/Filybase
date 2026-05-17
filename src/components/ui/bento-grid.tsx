import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-end overflow-hidden rounded-xl",
      "bg-black border border-white/[0.08]",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="relative z-10 p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
      <div className="flex flex-col gap-2">
        <Icon className="h-10 w-10 text-white mb-1" weight="duotone" />
        <h3 className="text-lg font-semibold text-white">
          {name}
        </h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

export { BentoCard, BentoGrid };
