import PaginationButtons from "./PaginationButtons";

function SearchResults({ results, type, total }) {
  return (
    <div className="mx-auto w-full px-3 sm:pl-[5%] md:pl-[14%] lg:pl-52 font-OpenSans">
      <p className="text-gray-500 text-md mb-5 mt-3">
        Showing {results.length} out of {total} {type} results
      </p>

      {results.map((result, index) => {
        const url = result.url || result.link; // Fallback for news

        return (
          <div key={url || index} className="max-w-xl mb-8 font-sans">
            {/* Title with link (both types) */}
            <div className="group">
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <h2 className="truncate text-xl text-blue-700 group-hover:underline font-OpenSans">
                    {result.title}
                  </h2>
                </a>
              )}
            </div>

            {/* Jobs content */}
            {type === "jobs" ? (
              <>
                <p className="text-gray-900 font-OpenSans">
                  {result.company} • {result.location}
                </p>
                <p className="text-gray-500 text-sm">
                  {result.job_employment_type} • {result.job_seniority_level}
                </p>

                {/* Job description */}
                <p className="text-gray-700 mt-3">
                  {result.description && result.description.length > 300
                    ? result.description.substring(0, 300) + "..." // Truncate for readability
                    : result.description}
                </p>

                {/* Optional: Add a "Read more" link to show the full description */}
                {result.description && result.description.length > 300 && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline mt-2 inline-block"
                  >
                    Read more
                  </a>
                )}
              </>
            ) : (
              // News content
              <>
                <p className="text-gray-500 text-sm">{result.date}</p>
                <p className="text-gray-900 font-OpenSans mt-1">{result.description}</p>
              </>
            )}
          </div>
        );
      })}

      <PaginationButtons />
    </div>
  );
}

export default SearchResults;