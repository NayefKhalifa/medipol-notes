import './App.css';
import React, { useState, useMemo, useEffect } from "react";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { collection, addDoc, onSnapshot, query as firestoreQuery, orderBy, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login"; 
import { supabase } from "./supabase";

// ---- Mock seed data -------------------------------------------------
const COURSES = [
  { code: "ANAT201", name: "Human Anatomy II", dept: "Medicine" },
  { code: "BIOC150", name: "Biochemistry Fundamentals", dept: "Medicine" },
  { code: "PHRM310", name: "Pharmacology", dept: "Medicine" },
  { code: "NURS110", name: "Fundamentals of Nursing", dept: "Nursing" },
  { code: "DENT220", name: "Oral Pathology", dept: "Dentistry" },
  { code: "PSYC101", name: "Introduction to Psychology", dept: "Psychology" },
  { code: "ENGR205", name: "Circuit Theory", dept: "Engineering" },
  { code: "BUSN140", name: "Principles of Marketing", dept: "Business" },
];

const SELLERS = ["Elif K.", "Mert Y.", "Zeynep A.", "Berk T.", "Selin D.", "Can O."];

function seedListings() {
  const types = ["Lecture notes", "Solved past exam", "Study guide", "Lab summary"];
  let id = 1;
  const listings = [];
  COURSES.forEach((c) => {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      listings.push({
        id: id++,
        course: c.code,
        title: `${types[i % types.length]} — ${c.name}`,
        type: types[i % types.length],
        seller: SELLERS[Math.floor(Math.random() * SELLERS.length)],
        price: [25, 35, 45, 60, 75][Math.floor(Math.random() * 5)],
        rating: (3.6 + Math.random() * 1.4).toFixed(1),
        sales: Math.floor(Math.random() * 40) + 1,
        pages: Math.floor(Math.random() * 20) + 4,
      });
    }
  });
  return listings;
}

// ---- Small building blocks -------------------------------------------------

function Stamp({ children, tone = "ink" }) {
  const tones = {
    ink: "border-[#1B2A4A] text-[#1B2A4A]",
    red: "border-[#B8342A] text-[#B8342A]",
    gold: "border-[#A87A17] text-[#A87A17]",
  };
  return (
    <span
      className={`inline-block border-2 ${tones[tone]} px-2 py-0.5 text-[11px] tracking-widest uppercase font-mono rotate-[-3deg] rounded-sm`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {children}
    </span>
  );
}

function PaperCard({ children, className = "" }) {
  return (
    <div
      className={`relative bg-[#F6F1E4] border border-[#D8CFB8] rounded-sm shadow-[0_1px_0_#D8CFB8,0_6px_14px_-8px_rgba(27,42,74,0.35)] ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(27,42,74,0.045) 28px)",
      }}
    >
      {/* torn/perforated top edge */}
      <div
        className="absolute -top-[6px] left-0 right-0 h-[6px]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 6px 6px, #F6F1E4 3px, transparent 3.5px)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0",
        }}
      />
      {children}
    </div>
  );
}

// ---- Main App -------------------------------------------------

export default function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);
    const [listings, setListings] = useState([]);

  useEffect(() => {
        const q = firestoreQuery(collection(db, "listings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [view, setView] = useState("browse"); // browse | sell | cart
  const [cart, setCart] = useState([]);
  const [sellForm, setSellForm] = useState({
  course: COURSES[0].code,
  title: "",
  type: "Lecture notes",
  price: 35,
  description: "",
  file: null,
});
  const [posted, setPosted] = useState(null);
  const [uploading, setUploading] = useState(false);

  const depts = ["All", ...Array.from(new Set(COURSES.map((c) => c.dept)))];

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const course = COURSES.find((c) => c.code === l.course);
      const matchesDept = dept === "All" || course.dept === dept;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        l.course.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        course.name.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  }, [listings, query, dept]);

  const addToCart = (item) => {
    if (cart.find((c) => c.id === item.id)) return;
    setCart([...cart, item]);
  };
  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));
  const total = cart.reduce((sum, c) => sum + c.price, 0);

  return (
    <div
      className="min-h-screen w-full text-[#2B2B2B]"
      style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        background: "#EDE6D3",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap"
      />

      {/* Header */}
      <header className="border-b-2 border-[#1B2A4A] bg-[#F6F1E4]">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-sm bg-[#1B2A4A] text-[#F6F1E4] flex items-center justify-center font-mono text-lg font-semibold rotate-[-2deg]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              MU
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                Kampüs Not Pazarı
              </h1>
              <p
                className="text-[12px] uppercase tracking-[0.14em] text-[#6B6250]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Notes &amp; past exams, shared by students
              </p>
            </div>
          </div>
          <nav
            className="flex items-center gap-1"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {[
              ["browse", "Browse"],
              ["sell", "Sell notes"],
              ["cart", `Cart (${cart.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                  view === key
                    ? "bg-[#1B2A4A] text-[#F6F1E4]"
                    : "text-[#1B2A4A] hover:bg-[#1B2A4A]/10"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
                  <button
          onClick={() => (user ? auth.signOut() : setShowLogin(true))}
          className="ml-2 text-[13px] font-semibold px-3 py-1.5 rounded-sm bg-[#1B2A4A] text-[#F6F1E4]"
        >
          {user ? "Sign out" : "Sign in"}
        </button>
        {user && (
          <span className="text-[12px] text-[#6B6250] ml-1">
            {user.email}
          </span>
        )}

        {showLogin && <Login onClose={() => setShowLogin(false)} />}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {view === "browse" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a course code, e.g. ANAT201…"
                className="flex-1 bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] placeholder:text-[#9A917A]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {depts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <PaperCard className="p-10 text-center">
                <p className="text-lg font-semibold mb-1">No listings here yet.</p>
                <p
                  className="text-[#6B6250] text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Be the first to post notes for this course.
                </p>
              </PaperCard>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                                {filtered.map((l) => {
                  const course = COURSES.find((c) => c.code === l.course);
                  const inCart = cart.find((c) => c.id === l.id);
                  const sellerLabel = l.sellerEmail
                    ? l.sellerEmail.split("@")[0]
                    : l.seller || "Unknown";
                  return (
                    <PaperCard key={l.id} className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <Stamp tone={l.type === "Solved past exam" ? "red" : "ink"}>
                          {l.course}
                        </Stamp>
                        <span
                          className="text-[13px] text-[#A87A17] font-semibold"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {l.rating ? `★ ${l.rating}` : "New"}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[17px] leading-snug">
                          {l.title}
                        </h3>
                        <p
                          className="text-[13px] text-[#6B6250] mt-0.5"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {course.name}{l.sales ? ` · ${l.sales} sold` : ""}
                        </p>
                        {l.description && (
  <p
    className="text-[13px] text-[#4A4436] line-clamp-2"
    style={{ fontFamily: "'Inter', sans-serif" }}
  >
    {l.description}
  </p>
)}
                      </div>
                      <div
                        className="flex items-center justify-between mt-1 pt-3 border-t border-dashed border-[#C9BE9F]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <span className="text-[13px] text-[#6B6250]">
                          by {sellerLabel}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-[15px]">
                            ₺{l.price}
                          </span>
                          <button
  onClick={() => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!user.emailVerified) {
      alert("Please verify your email before buying — check your inbox for the verification link.");
      return;
    }
    addToCart(l);
  }}
  disabled={!!inCart}
                            className={`text-[13px] font-semibold px-3 py-1.5 rounded-sm transition-colors ${
                              inCart
                                ? "bg-[#D8CFB8] text-[#6B6250] cursor-default"
                                : "bg-[#1B2A4A] text-[#F6F1E4] hover:bg-[#25396A]"
                            }`}
                          >
                            {inCart ? "In cart" : "Add to cart"}
                          </button>
                        </div>
                      </div>
                    </PaperCard>
                  );
                })}
              </div>
            )}
          </>
        )}
{view === "sell" && user && !user.emailVerified && (
  <PaperCard className="p-10 text-center max-w-md mx-auto">
    <p className="text-lg font-semibold mb-2">Verify your email first</p>
    <p className="text-[#6B6250] text-sm mb-4">
      We sent a verification link to {user.email}. Click it, then come back here.
    </p>
    <div className="flex gap-2 justify-center">
      <button
        onClick={async () => {
          await sendEmailVerification(user);
          alert("Verification email sent again — check your inbox.");
        }}
        className="bg-[#1B2A4A] text-[#F6F1E4] font-semibold text-sm px-4 py-2.5 rounded-sm"
      >
        Resend email
      </button>
      <button
        onClick={async () => {
          await user.reload();
          setUser({ ...auth.currentUser });
        }}
        className="bg-[#D8CFB8] text-[#1B2A4A] font-semibold text-sm px-4 py-2.5 rounded-sm"
      >
        I've verified — refresh
      </button>
    </div>
  </PaperCard>
)}
       {view === "sell" && user && user.emailVerified && (
  <PaperCard className="p-7 max-w-lg mx-auto">
    <div className="mb-5">
      <Stamp tone="gold">New listing</Stamp>
      <h2 className="text-xl font-bold mt-2">Sell your notes</h2>
      <p
        className="text-[13px] text-[#6B6250] mt-1"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        List once, earn every time a classmate buys it.
      </p>
    </div>

    {posted ? (
      <div className="text-center py-6">
        <p className="text-lg font-semibold mb-1">Listing posted.</p>
        <p
          className="text-[13px] text-[#6B6250] mb-4"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          "{posted.title}" is now visible under {posted.course}.
        </p>
        <button
          onClick={() => {
            setPosted(null);
            setView("browse");
          }}
          className="text-[13px] font-semibold px-4 py-2 rounded-sm bg-[#1B2A4A] text-[#F6F1E4]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          View in Browse
        </button>
      </div>
    ) : (
      <form
        className="flex flex-col gap-4"
        style={{ fontFamily: "'Inter', sans-serif" }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!sellForm.file) {
            alert("Please attach a PDF of your notes.");
            return;
          }
          setUploading(true);
          try {
            const fileExt = sellForm.file.name.split(".").pop();
const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
const filePath = `${user.uid}/${safeName}`;
            const { error: uploadError } = await supabase.storage
              .from("notes")
              .upload(filePath, sellForm.file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("notes")
              .getPublicUrl(filePath);

            await addDoc(collection(db, "listings"), {
              course: sellForm.course,
              title: sellForm.title,
              type: sellForm.type,
              price: sellForm.price,
              description: sellForm.description,
              fileUrl: urlData.publicUrl,
              sellerEmail: user.email,
              sellerId: user.uid,
              rating: null,
              sales: 0,
              createdAt: serverTimestamp(),
            });
            setPosted({ ...sellForm });
          } catch (err) {
            alert("Couldn't post listing: " + err.message);
          } finally {
            setUploading(false);
          }
        }}
      >
        <label className="text-sm font-medium">
          Course
          <select
            value={sellForm.course}
            onChange={(e) =>
              setSellForm({ ...sellForm, course: e.target.value })
            }
            className="mt-1 w-full bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          >
            {COURSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Title
          <input
            required
            value={sellForm.title}
            onChange={(e) =>
              setSellForm({ ...sellForm, title: e.target.value })
            }
            placeholder="e.g. Midterm 1 solved past exam"
            className="mt-1 w-full bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] placeholder:text-[#9A917A]"
          />
        </label>

        <label className="text-sm font-medium">
          Description
          <textarea
            required
            rows={3}
            value={sellForm.description}
            onChange={(e) =>
              setSellForm({ ...sellForm, description: e.target.value })
            }
            placeholder="What's inside? e.g. Covers weeks 1–7, includes solved examples for each formula, handwritten but clear."
            className="mt-1 w-full bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] placeholder:text-[#9A917A]"
          />
        </label>

        <label className="text-sm font-medium">
          Type
          <select
            value={sellForm.type}
            onChange={(e) =>
              setSellForm({ ...sellForm, type: e.target.value })
            }
            className="mt-1 w-full bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          >
            {["Lecture notes", "Solved past exam", "Study guide", "Lab summary"].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              )
            )}
          </select>
        </label>

        <label className="text-sm font-medium">
          Price (₺)
          <input
            type="number"
            min={5}
            max={300}
            value={sellForm.price}
            onChange={(e) =>
              setSellForm({ ...sellForm, price: Number(e.target.value) })
            }
            className="mt-1 w-full bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          />
        </label>

        <label className="text-sm font-medium">
          PDF file
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) =>
              setSellForm({ ...sellForm, file: e.target.files[0] })
            }
            className="mt-1 w-full bg-[#F6F1E4] border border-[#C9BE9F] rounded-sm px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          />
        </label>

        <button
          type="submit"
          disabled={uploading}
          className="mt-1 bg-[#B8342A] text-[#F6F1E4] font-semibold text-sm px-4 py-2.5 rounded-sm hover:bg-[#9C2C24] transition-colors disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Post listing"}
        </button>
      </form>
    )}
  </PaperCard>
)}

        {view === "cart" && (
          <div className="max-w-lg mx-auto">
            {cart.length === 0 ? (
              <PaperCard className="p-10 text-center">
                <p className="text-lg font-semibold mb-1">Your cart is empty.</p>
                <p
                  className="text-[#6B6250] text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Browse listings and add notes you need.
                </p>
              </PaperCard>
            ) : (
              <PaperCard className="p-6">
                <h2 className="text-xl font-bold mb-4">Your cart</h2>
                <div className="flex flex-col gap-3">
                  {cart.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between border-b border-dashed border-[#C9BE9F] pb-3"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <div>
                        <p className="font-medium text-[15px]">{c.title}</p>
                        <p className="text-[12px] text-[#6B6250]">{c.course}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">₺{c.price}</span>
                        <button
                          onClick={() => removeFromCart(c.id)}
                          className="text-[12px] text-[#B8342A] font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-center justify-between mt-5 pt-4 border-t-2 border-[#1B2A4A]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span className="font-semibold">Total</span>
                  <span className="font-mono font-bold text-lg">₺{total}</span>
                </div>
                <button
                  className="mt-4 w-full bg-[#1B2A4A] text-[#F6F1E4] font-semibold text-sm px-4 py-2.5 rounded-sm hover:bg-[#25396A] transition-colors"
                  onClick={() => {
  if (!user) {
    setShowLogin(true);
    return;
  }
  if (!user.emailVerified) {
    alert("Please verify your email before checking out — check your inbox for the verification link.");
    return;
  }
  alert("Checkout is mocked in this prototype — payments not wired up yet.");
}}
                >
                  Checkout
                </button>
              </PaperCard>
            )}
          </div>
        )}
      </main>

      <footer
        className="max-w-5xl mx-auto px-5 pb-10 pt-4 text-[12px] text-[#8A806A]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        An independent, student-run project, not affiliated with or endorsed by any university. Notes and past exams shared here should be your own original work — please don't upload professors' slides or copyrighted course materials.
      </footer>
    </div>
  );
}

