import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { SessionProvider } from '../src/context/SessionContext.jsx';

export default function Root({ path }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>
  );
}
