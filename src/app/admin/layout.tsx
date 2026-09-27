/* The admin panel keeps the light palette: a dense table of bookings reads
   better on white than on the glowing dark ground the public pages use.
   It also drops the public navigation, which is of no use here. */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="theme-light min-h-dvh bg-background text-foreground">
      <main id="main">{children}</main>
    </div>
  );
}
