import { Outlet } from "react-router-dom";

import Banner from "../components/Banner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CartSidebar from "../components/CartSidebar";
import { FavoritesProvider } from "../context/FavoritesContext";

const AppLayout = () => {
  return (
    <>
      <FavoritesProvider>
        <Banner />
        <Navbar />

        <main className="min-h-screen">
          <Outlet />
        </main>

        <Footer />
        <CartSidebar />
      </FavoritesProvider>
    </>
  );
};

export default AppLayout;
