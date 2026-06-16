import { Outlet, Link } from "react-router-dom";

function App() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <main>
        {/* This is where child routes (Home, About) will render */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;