// Worksheet utility functions

// Normalize worksheet records (convert old flat structure to nested statements)
export function normalizeWorksheet(worksheet) {
    if (!worksheet) return worksheet;

    if (Array.isArray(worksheet.statements)) {
        return worksheet;
    }

    const statements = extractFlatStatements(worksheet);
    if (!statements.length) {
        return worksheet;
    }

    return {
        ...worksheet,
        statements
    };
}

// Extract statements from legacy flat fields
function extractFlatStatements(worksheet) {
    const indices = new Set();

    Object.keys(worksheet).forEach((key) => {
        const match = key.match(/^statement(\d+)?$/);
        if (match) {
            const index = match[1] ? parseInt(match[1], 10) : 1;
            if (!Number.isNaN(index)) {
                indices.add(index);
            }
        }
    });

    if (indices.size === 0) return [];

    const sorted = Array.from(indices).sort((a, b) => a - b);

    return sorted
        .map((idx) => {
            const suffix = idx === 1 ? '' : idx;
            const statement = worksheet[`statement${idx}`] || '';
            const q1True = worksheet[`q1True${suffix}`] || '';
            const q2Absolutely = worksheet[`q2Absolutely${suffix}`] || '';
            const q3React = worksheet[`q3React${suffix}`] || '';
            const q4Without = worksheet[`q4Without${suffix}`] || '';
            const turnaround = worksheet[`turnaround${idx}`] || '';

            if (
                !statement &&
                !q1True &&
                !q2Absolutely &&
                !q3React &&
                !q4Without &&
                !turnaround
            ) {
                return null;
            }

            return {
                statement,
                q1True,
                q2Absolutely,
                q3React,
                q4Without,
                turnaround
            };
        })
        .filter(Boolean);
}

// Generate a truncated preview for the list view
export function getSituationPreview(worksheet) {
    const CHARACTER_LIMIT = 130;
    const fullText = (worksheet.situation || worksheet.person || '').trim();
    if (!fullText) {
        return 'No content';
    }

    const sentenceEndMatch = fullText.match(/[.!?](\s|$)/);
    const sentenceEndIndex = sentenceEndMatch ? sentenceEndMatch.index + 1 : fullText.length;

    let previewBase = fullText.slice(0, sentenceEndIndex);
    let preview = previewBase.length > CHARACTER_LIMIT ? previewBase.slice(0, CHARACTER_LIMIT) : previewBase;

    const wasTruncatedBySentence = sentenceEndIndex < fullText.length;
    const wasTruncatedByLength = previewBase.length > CHARACTER_LIMIT;

    if (wasTruncatedBySentence || wasTruncatedByLength) {
        preview = preview.trimEnd().replace(/\.$/, '') + '...';
    }

    return preview;
}

