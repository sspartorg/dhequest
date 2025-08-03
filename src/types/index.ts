export type PropsWithChildren<P = {}> = P & { children?: React.ReactNode };

export interface HeaderProps {
  title: string;
  links: Array<{ label: string; url: string }>;
}

export interface HomeProps {
  welcomeMessage: string;
}