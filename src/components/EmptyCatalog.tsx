/** Shown when the database answers, but there are no products in it. */
export default function EmptyCatalog() {
  return (
    <div className="mt-5 rounded-[1.75rem] bg-lime p-5">
      <p className="font-display text-lg font-bold">No products in the database yet</p>
      <p className="mt-1 text-sm text-plum/80">
        In Supabase, open the SQL Editor and run <code>seed-products.sql</code> (Step 2). Then refresh this page.
      </p>
    </div>
  )
}
