/* The admin panel follows the visitor's chosen theme like everything else,
   so the toggle means the same thing on every page. It drops the public
   navigation, which is of no use here. */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main id="main">{children}</main>
    </div>
  );
}
