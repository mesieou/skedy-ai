import { FloatingElements } from "../ui/floating-elements";

export function Hero() {
  return (
    <div className="relative flex flex-col gap-8 items-center min-h-[60vh] justify-center">
      <FloatingElements density="normal" />
      <div className="relative z-20 flex flex-col gap-8 items-center">
        <h1 className="text-4xl lg:text-6xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Welcome to Skedy AI
        </h1>
        <p className="text-xl text-muted-foreground text-center max-w-3xl leading-relaxed">
          Your intelligent scheduling assistant for tradies and professionals who get things done
        </p>
        <div className="flex gap-4 mt-4">
          <button className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl">
            Get Started
          </button>
          <button className="px-8 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors shadow-lg hover:shadow-xl">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
