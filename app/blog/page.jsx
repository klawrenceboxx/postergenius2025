import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Blog | PosterGenius",
  description:
    "Stay inspired with PosterGenius stories about design, printing craftsmanship, and creative wall art ideas.",
};

const posts = [
  {
    slug: "crafting-minimalist-posters",
    title: "Behind the Scenes: Crafting Minimalist Posters",
    date: "January 5, 2025",
    readingTime: "4 min read",
    tags: ["Design", "Process"],
    content: `## Why minimal matters\nKeeping the focus on a single emotion helps every poster feel intentional. We start by curating references that capture the story we want to tell.\n\n### The essentials\n- Step 1: Define the mood with a bold color palette and clean typography.\n- Step 2: Remove anything that distracts from the core narrative.\n- Step 3: Add subtle texture so the final piece feels tangible.\n\n**Pro tip:** Leave breathing room around your artwork—negative space is your best collaborator.`,
  },
  {
    slug: "mixing-analog-and-digital",
    title: "Mixing Analog Texture with Digital Polish",
    date: "February 12, 2025",
    readingTime: "6 min read",
    tags: ["Workflow", "Inspiration"],
    content: `## From sketchbook to screen\nOur illustrators still begin with pencil sketches. The grain and imperfections guide the personality of each character.\n\n### Digitizing the magic\n- Scan your sketch at a high resolution to capture the tiny pencil ridges.\n- Layer vibrant gradients in your favorite design tool.\n- Finish with selective noise to unify the analog and digital layers.\n\n*Remember:* The goal is not to hide the handmade qualities—it’s to spotlight them.`,
  },
  {
    slug: "styling-posters-at-home",
    title: "Styling Posters at Home Like a Gallery",
    date: "March 2, 2025",
    readingTime: "5 min read",
    tags: ["Home Decor", "Tips"],
    content: `## Build a storytelling wall\nHang prints in odd numbers and mix frame sizes for a dynamic layout. Start with a hero piece and layer supporting art around it.\n\n### Lighting cues\n- Use warm LED strips to highlight focal points without fading colors.\n- Spotlight matte frames to reduce glare on glossy prints.\n\nBack it all up with \`command strips\` for easy, renter-friendly installation.`,
  },
];

const inlinePattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

const renderInline = (text, keyPrefix) => {
  const segments = text.split(inlinePattern).filter((segment) => segment !== "");

  return segments.map((segment, index) => {
    const key = `${keyPrefix}-inline-${index}`;

    if (segment.startsWith("**") && segment.endsWith("**")) {
      return <strong key={key}>{segment.slice(2, -2)}</strong>;
    }

    if (segment.startsWith("*") && segment.endsWith("*")) {
      return (
        <em key={key} className="italic">
          {segment.slice(1, -1)}
        </em>
      );
    }

    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded bg-gray-200 px-1 py-0.5 font-mono text-[0.8rem] text-gray-800"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }

    return <span key={key}>{segment}</span>;
  });
};

const renderMarkdown = (markdown, keyPrefix) => {
  const lines = markdown.split(/\r?\n/);
  const elements = [];
  let listItems = [];

  const flushList = (lineIndex) => {
    if (listItems.length === 0) {
      return;
    }

    elements.push(
      <ul
        key={`${keyPrefix}-list-${lineIndex}`}
        className="list-none space-y-2 rounded-lg bg-white/60 p-4 shadow-inner"
      >
        {listItems}
      </ul>
    );

    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(index);
      return;
    }

    if (trimmed.startsWith("- ")) {
      const content = trimmed.slice(2).trim();
      listItems.push(
        <li
          key={`${keyPrefix}-li-${index}`}
          className="relative pl-4 text-gray-700 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-secondary"
        >
          {renderInline(content, `${keyPrefix}-li-${index}`)}
        </li>
      );
      return;
    }

    flushList(index);

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4
          key={`${keyPrefix}-h4-${index}`}
          className="text-base font-semibold text-gray-900"
        >
          {renderInline(trimmed.slice(4).trim(), `${keyPrefix}-h4-${index}`)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3
          key={`${keyPrefix}-h3-${index}`}
          className="text-lg font-semibold text-gray-900"
        >
          {renderInline(trimmed.slice(3).trim(), `${keyPrefix}-h3-${index}`)}
        </h3>
      );
      return;
    }

    elements.push(
      <p key={`${keyPrefix}-p-${index}`} className="text-gray-700">
        {renderInline(trimmed, `${keyPrefix}-p-${index}`)}
      </p>
    );
  });

  flushList("end");

  return elements;
};

const BlogPage = () => {
  return (
    <>
      <Navbar />
      <main className="bg-white text-gray-900">
        <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-16 lg:px-24">
          <header className="flex flex-col gap-4 text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
              Journal
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">PosterGenius Blog</h1>
            <p className="max-w-3xl text-base text-gray-600">
              Stories and tutorials from the PosterGenius team covering design
              process, printing craftsmanship, and decor inspiration for every
              room.
            </p>
          </header>

          <div className="mt-12 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-gray-50/70 p-8 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-secondary/50 hover:shadow-xl"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-secondary">
                    <span className="rounded-full bg-secondary/10 px-3 py-1 text-secondary">
                      {post.readingTime}
                    </span>
                    <time dateTime={post.date} className="text-gray-500">
                      {post.date}
                    </time>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={`${post.slug}-${tag}`}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-2xl font-semibold leading-tight text-gray-900">
                    {post.title}
                  </h2>

                  <div className="space-y-4 text-sm leading-relaxed">
                    {renderMarkdown(post.content, post.slug)}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-8 inline-flex items-center gap-2 self-start rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white transition hover:bg-tertiary"
                >
                  Read article
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12.293 3.293a1 1 0 011.414 0l4.999 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L15.586 11H2a1 1 0 110-2h13.586l-3.293-3.293a1 1 0 010-1.414z" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default BlogPage;
