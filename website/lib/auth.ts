import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { eq } from 'drizzle-orm';
import type { Provider } from 'next-auth/providers';

// Only register providers whose credentials are configured
const providers: Provider[] = [];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo',
        },
      },
    }),
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

/** Which providers are currently enabled — consumable by client components */
export const enabledProviders = {
  github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return true;

      try {
        const { db } = await import('@/lib/db');
        const { users } = await import('@/lib/db/schema');

        const providerIdField =
          account.provider === 'google' ? 'googleId' : 'githubId';
        const providerIdColumn =
          account.provider === 'google' ? users.googleId : users.githubId;

        // Try to find user by provider ID first, then by email
        const existingByProvider = account.providerAccountId
          ? await db
              .select()
              .from(users)
              .where(eq(providerIdColumn, account.providerAccountId))
              .limit(1)
          : [];

        if (existingByProvider.length > 0) {
          await db
            .update(users)
            .set({
              name: user.name ?? existingByProvider[0].name,
              avatarUrl: user.image ?? existingByProvider[0].avatarUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingByProvider[0].id));
          return true;
        }

        const existingByEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (existingByEmail.length > 0) {
          await db
            .update(users)
            .set({
              [providerIdField]: account.providerAccountId,
              name: user.name ?? existingByEmail[0].name,
              avatarUrl: user.image ?? existingByEmail[0].avatarUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingByEmail[0].id));
          return true;
        }

        // Create new user
        await db.insert(users).values({
          email: user.email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          [providerIdField]: account.providerAccountId,
        });

        return true;
      } catch (error) {
        console.error('Auth signIn callback DB error:', error);
        // Allow sign-in even if DB is unavailable — JWT session still works
        return true;
      }
    },

    async jwt({ token, user, account }) {
      if (user && user.email) {
        try {
          const { db } = await import('@/lib/db');
          const { users } = await import('@/lib/db/schema');

          const dbUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (dbUser.length > 0) {
            token.userId = dbUser[0].id;
          }
        } catch (error) {
          console.error('Auth jwt callback DB error:', error);
        }
      }

      if (user && !token.userId) {
        token.id = user.id;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      if (account?.provider === 'github') {
        token.githubUsername = (user as { login?: string } | undefined)?.login;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? (token.id as string);
      }
      session.accessToken = token.accessToken as string | undefined;
      session.provider = token.provider as string | undefined;
      session.githubUsername = token.githubUsername as string | undefined;
      return session;
    },
  },
});
