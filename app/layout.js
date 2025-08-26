import { Poppins } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import { AuthProvider } from "../lib/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Doc App",
  description: "Doc App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className={`${poppins.className} antialiased`}>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
