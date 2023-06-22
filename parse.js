function lexer(str) {
    let tokens = [];
    let inString = null;

    let skipNext = false;

    for (let charIndex = 0; charIndex < str.length; charIndex++) {
        let currentChar = str[charIndex];

        skipNext = currentChar == "\\";

        if (currentChar == `"` && inString == null) {
            inString = `"`;
            tokens.push({
                "type": "string",
                "value": ""
            });
        } else if (currentChar == `"` && inString == `"` && !skipNext) {
            inString = null;
        } else if (inString != null) {
            tokens[tokens.length - 1].value += currentChar;
        } else if (currentChar == "=") {
            tokens.push({
                "type": "assign",
            });
        } else if (currentChar == " ") {
            if (tokens.length > 0 && tokens[tokens.length - 1].type == "whitespace") {
                tokens[tokens.length - 1].value += " ";
            } else {
                tokens.push({
                    type: "whitespace",
                    value: " "
                });
            }
        } else if (currentChar == "\n") {
            if (tokens.length > 0 && tokens[tokens.length - 1].type == "whitespace") {
                tokens[tokens.length - 1].value += "\n";
            } else {
                tokens.push({
                    type: "whitespace",
                    value: "\n"
                });
            }
        } else if (currentChar == "\r") {
            if (tokens.length > 0 && tokens[tokens.length - 1].type == "whitespace") {
                tokens[tokens.length - 1].value += "\r";
            } else {
                tokens.push({
                    type: "whitespace",
                    value: "\r"
                });
            }
        } else if (currentChar == "\t") {
            if (tokens.length > 0 && tokens[tokens.length - 1].type == "whitespace") {
                tokens[tokens.length - 1].value += "\t";
            } else {
                tokens.push({
                    type: "whitespace",
                    value: "\t"
                });
            }
        } else {
            if (tokens.length > 0 && tokens[tokens.length - 1].type == "text") {
                tokens[tokens.length - 1].value += currentChar;
            } else {
                tokens.push({
                    type: "text",
                    value: currentChar
                });
            }
        }
    }

    return tokens;
}

function parser(tokens) {
    let attributes = {};
    for (let tokenId = 0; tokenId < tokens.length; tokenId++) {
        let currentToken = tokens[tokenId];
        if (currentToken.type == "whitespace") continue;
        if (currentToken.type == "text") {
            if (tokenId + 1 >= tokens.length) {
                attributes[currentToken.value] = true;
                continue;
            }
            let nextToken = tokens[tokenId + 1];
            if (nextToken.type != "assign") {
                throw new Error(`Unexpected type "${nextToken.type}" after attribute name "${currentToken.value}"`);
            }
            if (tokenId + 2 >= tokens.length) {
                throw new Error(`Unexpected ending for attribute "${currentToken.value}"`);
            }
            let nextNextToken = tokens[tokenId + 2];
            if (nextNextToken.type != "text" && nextNextToken.type != "string") {
                throw new Error(`Cannot assign type "${nextNextToken.type}" to attribute "${currentToken.value}"`);
            }
            if (nextNextToken.type == "text") {
                attributes[currentToken.value] = eval(nextNextToken.value);
                tokenId += 2;
                continue;
            }
            if (nextNextToken.type == "string") {
                attributes[currentToken.value] = nextNextToken.value;
                tokenId += 2;
                continue;
            }
            throw new Error(`What were you doing for attribute "${currentToken.value}"?`);
        }
        throw new Error(`Unexpected token type "${currentToken.type}". Expected either a whitespace or some text (an attribute name)`);
    }
    return attributes;
}

function parseHtmlAttributes(attrString) {
    let tokens = lexer(attrString);
    let parsed = parser(tokens);
    return parsed;
}

module.exports = parseHtmlAttributes;