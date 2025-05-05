import Image from "next/image";
import { useRouter } from "next/router";
import { useRef, useState, useEffect } from "react";
import { MicrophoneIcon, SearchIcon, XIcon } from "@heroicons/react/outline";
import Avatar from "./Avatar";
import logo from './logo.jpg'; //

function Header() {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [searchType, setSearchType] = useState("jobs");

  // Preserve query values on initial load
  useEffect(() => {
    if (router.query.type) {
      setSearchType(router.query.type);
    }
  }, [router.query.type]);

  const search = async (e) => {
    e.preventDefault();
    const term = searchInputRef.current.value;

    if (!term) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/search?term=${term}&type=${searchType}`
      );
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
      console.error("Error fetching data:", error);
    }
  };

  return (
    <header className="sticky top-0 bg-white z-50">
      <div className="flex w-full p-6 items-center">
        <Image
          src={logo}
          height={40}
          width={120}
          onClick={() => router.push("/")}
          className="cursor-pointer"
        />

        <form
          onSubmit={search}
          className="flex flex-grow px-5 py-3 ml-10 mr-5 border border-gray-200 rounded-full shadow-lg max-w-3xl items-center"
        >
          <input
            ref={searchInputRef}
            defaultValue={router.query.term}
            className="flex-grow w-full focus:outline-none"
            type="text"
          />
          <XIcon
            className="h-7 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125"
            onClick={() => (searchInputRef.current.value = "")}
          />
          <MicrophoneIcon className="mr-3 h-6 hidden sm:inline-flex text-gray-500 border-l-2 pl-4 border-gray-300" />
          <button type="submit">
            <SearchIcon className="mb-1 h-5 hidden sm:inline-flex text-gray-500 transition duration-100 transform hover:scale-125" />
          </button>
        </form>

        <Avatar
          className="ml-auto"
          url="https://i.pinimg.com/564x/de/6b/29/de6b295da4ff46c17e31688c5b274f8a.jpg"
        />
      </div>

      {/* Type selection */}
      <div className="flex justify-center mt-2 space-x-4">
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

    </header>
  );
}

export default Header;
