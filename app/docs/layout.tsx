import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import type { ReactNode } from "react";

export const metadata = {
  title: {
    default: "Composer Docs",
    template: "%s - Composer Docs",
  },
  description:
    "Documentation for Composer, a visual AI workflow builder for creating multi-model pipelines.",
};

const navbar = (
  <Navbar
    logo={
      <span style={{ fontWeight: 700 }}>
        Composer <span style={{ opacity: 0.6, fontWeight: 400 }}>Docs</span>
      </span>
    }
    projectLink="https://github.com/heyadam/composer"
  />
);

const footer = (
  <Footer>
    <a href="https://composer.design" target="_blank" rel="noopener noreferrer">
      composer.design
    </a>{" "}
    {new Date().getFullYear()}
  </Footer>
);

export default async function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pageMap = await getPageMap("/docs");

  return (
    <Layout
      navbar={navbar}
      pageMap={pageMap}
      docsRepositoryBase="https://github.com/heyadam/composer/tree/main"
      footer={footer}
      sidebar={{ defaultMenuCollapseLevel: 1 }}
      editLink="Edit this page on GitHub"
    >
      {children}
    </Layout>
  );
}
