import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    provider?: string;
    githubUsername?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    userId?: string;
    accessToken?: string;
    provider?: string;
    githubUsername?: string;
  }
}
