import { notFound } from 'next/navigation';
import { ComponentGallery } from './component-gallery';

// A developer preview of the shared UI components. It shows demo data only,
// so it is never served in production.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <ComponentGallery />;
}
