import { ExtractedData } from "../types";

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export const exportToGoogleSheet = async (
  spreadsheetId: string, 
  accessToken: string, 
  data: ExtractedData
): Promise<void> => {
  if (!spreadsheetId || !accessToken) {
    throw new Error("Missing Spreadsheet ID or Access Token");
  }

  // --- 0. Fetch Spreadsheet Metadata to get correct Sheet Name ---
  // We cannot assume "Sheet1". If the user renamed it, the API will fail.
  const metaResponse = await fetch(`${BASE_URL}/${spreadsheetId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!metaResponse.ok) {
     const err = await metaResponse.json();
     throw new Error(err.error?.message || "Failed to access spreadsheet. Check ID and permissions.");
  }

  const metaData = await metaResponse.json();
  const sheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  // Helper: Format sheet name for A1 notation (escape quotes, wrap in quotes if spaces needed)
  const formatSheetName = (name: string) => {
    // If name is simple alphanumeric, return as is. Otherwise quote it.
    if (/^[a-zA-Z0-9_]+$/.test(name)) return name; 
    return `'${name.replace(/'/g, "''")}'`;
  };
  
  const a1SheetName = formatSheetName(sheetTitle);

  // --- 1. Prepare Data for Export ---
  const globalHeaders = data.fields.map(f => f.label);
  const globalValues = data.fields.map(f => String(f.value));

  let finalHeaders: string[] = [...globalHeaders];
  let rowsToAppend: string[][] = [];

  if (data.tables.length > 0) {
    const primaryTable = data.tables[0];
    finalHeaders = [...finalHeaders, ...primaryTable.headers];

    primaryTable.rows.forEach(tableRow => {
      const rowVals = tableRow.values.map(v => String(v));
      while (rowVals.length < primaryTable.headers.length) rowVals.push("");
      rowsToAppend.push([...globalValues, ...rowVals]);
    });
  } else {
    rowsToAppend.push(globalValues);
  }

  // --- 2. Fetch Existing Headers ---
  const headerRange = `${a1SheetName}!A1:Z1`;
  const encodedHeaderRange = encodeURIComponent(headerRange);
  
  const getResponse = await fetch(`${BASE_URL}/${spreadsheetId}/values/${encodedHeaderRange}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  let existingHeaders: string[] = [];

  if (getResponse.ok) {
    const getResult = await getResponse.json();
    existingHeaders = getResult.values?.[0] || [];
  } else {
    // If 400 or 404, it might just be an empty sheet or range not found yet. 
    // We proceed assuming no headers exist yet.
    console.warn("Could not fetch existing headers (sheet might be empty).");
  }

  // --- 3. Compute Header Union ---
  const masterHeaders = [...existingHeaders];
  let headersChanged = false;

  finalHeaders.forEach(h => {
    if (!masterHeaders.includes(h)) {
      masterHeaders.push(h);
      headersChanged = true;
    }
  });

  // Update sheet headers if needed
  if (headersChanged) {
    const updateRange = `${a1SheetName}!A1`;
    const encodedUpdateRange = encodeURIComponent(updateRange);

    await fetch(`${BASE_URL}/${spreadsheetId}/values/${encodedUpdateRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: updateRange,
        majorDimension: 'ROWS',
        values: [masterHeaders]
      })
    });
  }

  // --- 4. Map Values to Master Headers Order ---
  const formattedRows = rowsToAppend.map(localRow => {
    return masterHeaders.map(header => {
      const localIndex = finalHeaders.indexOf(header);
      return localIndex !== -1 ? localRow[localIndex] : "";
    });
  });

  // --- 5. Append Rows ---
  const appendRange = `${a1SheetName}!A2`;
  const encodedAppendRange = encodeURIComponent(appendRange);

  const appendResponse = await fetch(`${BASE_URL}/${spreadsheetId}/values/${encodedAppendRange}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: appendRange,
      majorDimension: 'ROWS',
      values: formattedRows
    })
  });

  if (!appendResponse.ok) {
    const err = await appendResponse.json();
    throw new Error(err.error?.message || "Failed to append row");
  }
};