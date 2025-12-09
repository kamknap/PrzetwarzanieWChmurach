import AuthContainer from "./components/AuthContainer";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>Wypożyczalnia Filmów</h1>
      </header>
      <main>
        <AuthContainer />
      </main>
    </div>
  );
}
