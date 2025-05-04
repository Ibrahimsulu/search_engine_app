import Head from "next/head";
import Header from "../components/Header";
import SearchResults from "../components/SearchResults";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Search = () => {
  const router = useRouter();
  const { term, type, start } = router.query;
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  
  useEffect(() => {
    if (term && type) {
      const fetchResults = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/search?term=${term}&start=${start || 0}&type=${type}`
          );
          const data = await response.json();
          setResults(data.results);
          setTotal(data.total);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchResults();
    }
  }, [term, type, start]);   // Refetch data when `term`, `type`, or `start` changes

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  if (!results.length) return <p className="text-center mt-10">No results found.</p>;

  return (
    <div>
      <Head>
        <title>{term} - {type} results</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <SearchResults results={results} type={type} total={total} />
    </div>
  );
};

export default Search;
