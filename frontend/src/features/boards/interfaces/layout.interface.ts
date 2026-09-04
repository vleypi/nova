export interface IHeaderLink {
  label: string;
  href: string;
}
export interface IFooterLink {
  label: string;
  href: string;
}
export interface IFooterSocial {
  icon: string;
  href: string;
}
export interface IFooterSection {
  title: string;
  links: IFooterLink[];
}
