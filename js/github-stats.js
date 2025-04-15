// GitHub Stats Fetcher
const GITHUB_USERNAME = 'ChristopherJoshy';

async function fetchGitHubStats() {
    try {
        // Fetch user data
        const userResponse = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
        const userData = await userResponse.json();
        
        // Fetch repositories
        const reposResponse = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`);
        const reposData = await reposResponse.json();
        
        // Calculate stats
        const totalStars = reposData.reduce((total, repo) => total + repo.stargazers_count, 0);
        
        // Get total commits (this is an approximation as GitHub API doesn't provide total commits directly)
        let totalCommits = 0;
        const commitPromises = reposData.slice(0, 5).map(repo => // Limit to 5 repos to avoid rate limiting
            fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/commits?per_page=1`)
                .then(response => {
                    const linkHeader = response.headers.get('Link');
                    if (linkHeader) {
                        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                        if (match) {
                            return parseInt(match[1]);
                        }
                    }
                    return 0;
                })
        );
        
        const commitCounts = await Promise.all(commitPromises);
        totalCommits = commitCounts.reduce((total, count) => total + count, 0);
        
        // Get pull requests and contributions
        const pullRequestsResponse = await fetch(`https://api.github.com/search/issues?q=author:${GITHUB_USERNAME}+type:pr`);
        const pullRequestsData = await pullRequestsResponse.json();
        const totalPRs = pullRequestsData.total_count;
        
        // Update the UI
        updateGitHubStatsUI(totalStars, totalCommits || 207, totalPRs, reposData.length);
        
    } catch (error) {
        console.error('Error fetching GitHub stats:', error);
        // Use fallback values if API fails
        updateGitHubStatsUI(19, 207, 1, 1);
    }
}

function updateGitHubStatsUI(stars, commits, prs, contributions) {
    document.getElementById('github-stars').textContent = stars;
    document.getElementById('github-commits').textContent = commits;
    document.getElementById('github-prs').textContent = prs;
    document.getElementById('github-contributions').textContent = contributions;
}

// Export the function
export { fetchGitHubStats };