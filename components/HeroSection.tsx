import Image from "next/image";

const HeroSection = () => {
  return (
    <section className="px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto bg-[#F5E6C8] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        {/* Left Content: Text & CTA */}
        <div className="flex-1 z-10 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Your Library
          </h1>
          <p className="text-gray-700 text-lg max-w-sm leading-relaxed">
            Convert your books into interactive AI conversations. Listen, learn,
            and discuss your favorite reads.
          </p>
          <button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all">
            <span className="text-xl">+</span> Add new book
          </button>
        </div>

        {/* Center Content: Illustration Placeholder */}
        {/* Note: You would replace the <img> with your actual asset */}
        <div className="flex-1 flex justify-center z-10">
          <Image
            src="/hero-illustration.jpg"
            alt="Library Illustration"
            className="rounded-md"
            width={130}
            height={120}
          />
        </div>

        {/* Right Content: How it Works Steps */}
        <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl p-6 space-y-6 md:max-w-xs">
          <StepItem
            number={1}
            title="Upload PDF"
            description="Add your book file"
          />
          <StepItem
            number={2}
            title="AI Processing"
            description="We analyze the content"
          />
          <StepItem
            number={3}
            title="Voice Chat"
            description="Discuss with AI"
          />
        </div>
      </div>
      <div className="library-hero-grid">{}</div>
    </section>
  );
};

const StepItem = ({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4">
    <div className="shrink-0 w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-sm font-medium text-gray-700">
      {number}
    </div>
    <div>
      <h3 className="font-bold text-gray-900 leading-none mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

export default HeroSection;
