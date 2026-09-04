import { Hero, SuccessStory, Templates } from "@/features/landing";

// Главная страница лендинга
export default function LandingPage() {
  return (
    <main className="font-inter bg-white text-gray-800 overflow-x-hidden">
      <Hero />
      <Templates />
      <SuccessStory />
    </main>
  );
}
