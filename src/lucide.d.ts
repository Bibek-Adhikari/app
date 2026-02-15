declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export const MessageSquare: FC<LucideProps>;
  export const Loader2: FC<LucideProps>;
  export const Mail: FC<LucideProps>;
  export const Lock: FC<LucideProps>;
  export const Eye: FC<LucideProps>;
  export const EyeOff: FC<LucideProps>;
  // Add other icons as you use them
}