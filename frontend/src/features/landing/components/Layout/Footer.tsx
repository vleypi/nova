"use client";
import Link from "next/link";
import {
  FOOTER_SECTIONS,
  FOOTER_SOCIAL_LINKS,
} from "@/features/boards/constants/layout.constant";
export function Footer() {
  const footerSections = FOOTER_SECTIONS.map((section) => {
    const sectionLinks = section.links.map((link) => (
      <li key={link.label}>
        <Link href={link.href} className="hover:text-white">
          {link.label}
        </Link>
      </li>
    ));
    return (
      <div key={section.title}>
        <h4 className="font-bold text-lg mb-4">{section.title}</h4>
        <ul className="space-y-2 text-gray-400">{sectionLinks}</ul>
      </div>
    );
  });
  const socialLinks = FOOTER_SOCIAL_LINKS.map((social) => (
    <a
      key={social.icon}
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-400 hover:text-white"
    >
      <i className={`fab fa-${social.icon} text-xl`}></i>
    </a>
  ));
  return (
    <footer className="bg-nova-dark text-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12">
          <div className="mb-8 md:mb-0">
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-nova-blue font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold">Nova</span>
            </Link>
            <p className="text-gray-400 max-w-xs">
              Платформа для визуальной коллаборации, которая соединяет команды.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16">
            {footerSections}
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-gray-400">
            © 2025 Nova. Все права защищены.
          </div>
          <div className="flex space-x-6">{socialLinks}</div>
        </div>
      </div>
    </footer>
  );
}
