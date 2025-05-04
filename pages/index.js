import Head from "next/head";
import Avatar from "../components/Avatar";
import Header from "../components/Header";
import { SearchIcon, MicrophoneIcon } from "@heroicons/react/outline";
import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [searchType, setSearchType] = useState("jobs");

  const search = async (e) => {
    e.preventDefault();
    const term = searchInputRef.current.value;

    if (!term) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/search?term=${term}&type=${searchType}`);
      const data = await response.json();

      router.push({
        pathname: "/search",
        query: {
          term,
          type: searchType,
          results: JSON.stringify(data),
        },
      });
      
    } catch (error) {
      console.error("Error fetching data from the API:", error);
    }
  };

  return (
    <div className="flex flex-col items-center h-screen">
      <form className="flex flex-col items-center pt-3 flex-grow w-4/5">
        <Image src="https://i.imgur.com/IZuI2H9.gif" height={207} width={700} priority />
        <div className="flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl">
          <SearchIcon className="h-5 mr-3 text-gray-700" />
          <input ref={searchInputRef} type="text" className="flex-grow focus:outline-none" />
          <MicrophoneIcon className="h-5" />
        </div>

        <div className="flex space-x-4 mt-4">
          <label className="text-sm">
            <input
              type="radio"
              value="jobs"
              checked={searchType === "jobs"}
              onChange={(e) => setSearchType(e.target.value)}
              className="mr-1"
            />
            Jobs
          </label>
          <label className="text-sm">
            <input
              type="radio"
              value="news"
              checked={searchType === "news"}
              onChange={(e) => setSearchType(e.target.value)}
              className="mr-1"
            />
            News
          </label>
        </div>

        <div className="flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4 font-Ubuntu">
          <button onClick={search} className="btn">Google Search</button>
          <button className="btn">
            <a href="https://www.google.com/doodles">I&apos;m Feeling Lucky</a>
          </button>
        </div>
      </form>
    </div>
  );
}