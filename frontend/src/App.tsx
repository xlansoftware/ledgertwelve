import { Outlet } from "react-router-dom";
import Header from "./components/layout/Header";

function App() {
  return (
    <div className="flex flex-col bg-background h-full">
      <Header />
      <main className="flex-1 container mx-auto py-4 h-full overflow-hidden">
        {/* This is where child routes (Home, About) will render */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;