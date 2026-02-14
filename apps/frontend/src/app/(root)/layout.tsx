import Appbar from "@/components/Appbar";
import { Footer } from "@/components/Footer";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Appbar />
      {children}
      <Footer />
    </div>
  );
}
