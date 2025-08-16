import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Overview } from '@/pages/Overview';
import { Variants } from '@/pages/Variants';
import { NewVariant } from '@/pages/NewVariant';
import { ThemeMapping } from '@/pages/ThemeMapping';
import { Analytics } from '@/pages/Analytics';
import { Brand } from '@/pages/Brand';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="variants" element={<Variants />} />
        <Route path="variants/new" element={<NewVariant />} />
        <Route path="variants/mapping" element={<ThemeMapping />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="brand" element={<Brand />} />
      </Route>
    </Routes>
  );
}

export default App;