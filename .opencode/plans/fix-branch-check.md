# Plan: Fix checkBranchExists

## Problem
Current implementation uses `filter` parameter which may not work correctly, and doesn't set a limit. Bitbucket Server API has a default limit of 25 results, causing branches to not be found when there are many branches.

## Solution
Update `checkBranchExists` in `src/bitbucket.ts` to:
1. Use `filterText` parameter instead of `filter`
2. Add `limit: 1000` to increase results per page

## File to modify
`src/bitbucket.ts` - lines 33-45

## Change
```typescript
// FROM:
async checkBranchExists(branch: string): Promise<boolean> {
  try {
    const response = await this.client.get(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/branches`,
      { params: { filter: branch } }
    );

    const branches = response.data.values || [];
    return branches.some((b: any) => b.displayId === branch);
  } catch (error) {
    return false;
  }
}

// TO:
async checkBranchExists(branch: string): Promise<boolean> {
  try {
    const response = await this.client.get(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/branches`,
      { 
        params: { 
          filterText: branch,
          limit: 1000
        } 
      }
    );

    const branches = response.data.values || [];
    return branches.some((b: any) => b.displayId === branch);
  } catch (error) {
    return false;
  }
}
```

## Why this works
- `filterText` parameter filters branches by name substring in Bitbucket Server API
- `limit: 1000` increases results per page (default is 25)
- `.some((b: any) => b.displayId === branch)` ensures exact match

## Verification
After making the change, run:
```bash
npm run build
```
