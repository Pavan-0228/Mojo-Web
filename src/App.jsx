import { useState, useEffect } from "react";

function App() {
  const [profile, setProfile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageInsights, setPageInsights] = useState(null);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  useEffect(() => {
    window.fbAsyncInit = function () {
      FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v16.0",
      });
    };

    (function (d, s, id) {
      var js,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        return;
      }
      js = d.createElement(s);
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");
  }, []);

  const handleFBLogin = () => {
    FB.login(
      function (response) {
        if (response.authResponse) {
          const { accessToken } = response.authResponse;

          FB.api("/me/accounts", { access_token: accessToken }, function (pagesResponse) {
            setPages(pagesResponse.data);
          });

          FB.api("/me", { fields: "name,picture,link" }, function (profileResponse) {
            setProfile({
              name: profileResponse.name,
              picture: profileResponse.picture.data.url,
              link: profileResponse.link,
            });
          });
        } else {
          console.log("User cancelled login or did not fully authorize.");
        }
      },
      {
        scope: "public_profile,email,pages_read_engagement,pages_read_user_content",
      }
    );
  };

  const fetchPageInsights = (pageId, pageAccessToken) => {
    if (!pageId || !pageAccessToken) return; // Ensure valid inputs

    const metrics = ["page_fans", "page_engaged_users", "page_impressions_unique", "page_reactions_by_type_total"];
    
    // Use default dates if not provided
    const today = new Date();
    const defaultUntil = new Date(today);
    defaultUntil.setDate(today.getDate() + 1); // Tomorrow's date

    const sinceTimestamp = since ? Math.floor(new Date(since).getTime() / 1000) : Math.floor(today.getTime() / 1000);
    const untilTimestamp = until ? Math.floor(new Date(until).getTime() / 1000) : Math.floor(defaultUntil.getTime() / 1000);

    const requests = metrics.map((metric) => {
      const url = new URL(`https://graph.facebook.com/${pageId}/insights/${metric}`);
      url.searchParams.append("access_token", pageAccessToken);
      url.searchParams.append("period", "total_over_range");

      if (sinceTimestamp) url.searchParams.append("since", sinceTimestamp);
      if (untilTimestamp) url.searchParams.append("until", untilTimestamp);

      return fetch(url).then((response) => response.json());
    });

    Promise.all(requests)
      .then((responses) => {
        const insights = responses.reduce((acc, response, index) => {
          acc[metrics[index]] = response.data;
          return acc;
        }, {});
        setPageInsights(insights);
      })
      .catch((error) => console.error("Error fetching page insights:", error));
  };

  const handlePageSelect = (event) => {
    const pageId = event.target.value;
    const page = pages.find((p) => p.id === pageId);
    if (page) {
      setSelectedPage(page);
    }
  };

  // UseEffect to fetch insights when selectedPage, since, or until changes
  useEffect(() => {
    if (selectedPage) {
      fetchPageInsights(selectedPage.id, selectedPage.access_token);
    }
  }, [selectedPage, since, until]);

  const getInsightValue = (insights, key) => {
    return insights?.[key]?.[0]?.values?.[0]?.value ?? "N/A";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 to-blue-100">
      {!profile ? (
        <div>
          <button
            onClick={handleFBLogin}
            className="bg-blue-600 text-white py-2 px-4 rounded flex items-center text-lg cursor-pointer hover:bg-blue-700 transition-transform transform hover:scale-105"
          >
            <img
              src="https://img.freepik.com/premium-vector/facebook-app-icon-social-media-logo-vector-illustration-meta_277909-402.jpg"
              alt="Facebook"
              className="w-6 h-6 mr-2"
            />
            Login with Facebook
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">{profile.name}</h1>
          <img src={profile.picture} alt="Profile" className="w-32 h-32 rounded-full mx-auto my-4 shadow-md" />
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Select a Page</h2>
            <select
              onChange={handlePageSelect}
              className="bg-white border border-gray-300 rounded p-2 mb-4 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Select a Page</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>

            <div className="flex gap-4 justify-center mt-4">
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {pageInsights && selectedPage && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded shadow-lg hover:shadow-2xl transition-shadow transform hover:-translate-y-1">
                  <h3 className="text-lg font-semibold text-gray-700">Total Followers</h3>
                  <p className="text-gray-800 text-2xl font-bold">{getInsightValue(pageInsights, "page_fans")}</p>
                  <p className="text-sm text-gray-600 mt-2">This metric shows the total number of people who have liked your page.</p>
                </div>
                <div className="bg-white p-4 rounded shadow-lg hover:shadow-2xl transition-shadow transform hover:-translate-y-1">
                  <h3 className="text-lg font-semibold text-gray-700">Total Engagement</h3>
                  <p className="text-gray-800 text-2xl font-bold">{getInsightValue(pageInsights, "page_engaged_users")}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    This metric shows the number of unique users who engaged with your content through likes, shares, comments, or clicks.
                  </p>
                </div>
                <div className="bg-white p-4 rounded shadow-lg hover:shadow-2xl transition-shadow transform hover:-translate-y-1">
                  <h3 className="text-lg font-semibold text-gray-700">Total Impressions</h3>
                  <p className="text-gray-800 text-2xl font-bold">{getInsightValue(pageInsights, "page_impressions_unique")}</p>
                  <p className="text-sm text-gray-600 mt-2">This metric shows the total number of times your content was viewed by unique users.</p>
                </div>
                <div className="bg-white p-4 rounded shadow-lg hover:shadow-2xl transition-shadow transform hover:-translate-y-1">
                  <h3 className="text-lg font-semibold text-gray-700">Total Reactions</h3>
                  <p className="text-gray-800 text-2xl font-bold">{getInsightValue(pageInsights, "page_reactions_by_type_total")}</p>
                  <p className="text-sm text-gray-600 mt-2">This metric shows the total number of reactions (likes, loves, wows, etc.) received on your posts.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
