const fs = require("fs");
const path = require("path");

const parseHtmlAttributes = require("./parse");

const CODE = fs.readFileSync("./example/app/index.htx", 'utf8');

const REGEX = {
    globalVariable: /^\$GLOBAL_[A-Za-z0-9_$]+/,
    localVariable: /^\$[A-Za-z0-9_$]+/,
    componentImportStatement: /<!-- ?import ([A-Za-z0-9$./_-]+ from )?"[^"\n]+" ?-->/,
    innerChildComponent: /^<INNER *\/?>/,
    componentTag: {
        open: /^<[A-Z][A-Za-z0-9\-_$]*( [^>]*[^/])?>/,
        close: /^<\/[A-Z][A-Za-z0-9\-_$]*[\n ]*>/,
        single: /^<[A-Z][A-Za-z0-9\-_$]*( [^>]*)?\/>/
    }
}

function valueToPhpFormat(value) {
    if (typeof (value) == "string") {
        return `"${value}"`;
    }
    if (typeof (value) == "number" || typeof (value) == "boolean") {
        return value.toString();
    }
}

function jsonToPhpFormat(jsonObject) {
    return `[${Object.keys(jsonObject).map(key => `"${key}" => ${valueToPhpFormat(jsonObject[key])}`).join(",")}]`;
}

function usesFromSyntax(importParamaters) {
    return importParamaters.length >= 3 && importParamaters[1] == "from";
}

function convert(code, props, children = "", filePath = "./index.htx", uid = 0) {
    let components = {};
    let componentChildStack = [{
        component: null,
        attr: {},
        children: ""
    }];

    const addToOutput = (...content) => {
        componentChildStack[componentChildStack.length - 1].children += content.join("");
    };

    for (let charIndex = 0; charIndex < code.length; charIndex++) {
        let match;
        if ((match = code.slice(charIndex).match(REGEX.componentImportStatement)) != null) {
            let importParamaters = match[0].slice("<!--".length, -"-->".length).trim().slice("import ".length).split(" ");

            let componentFileName;
            let componentName;
            if (usesFromSyntax(importParamaters)) {
                componentName = importParamaters[0];
                componentFileName = importParamaters.slice(2).join(" ").slice(1, -1) + ".htx";
            } else {
                let fileNameWithoutExtension = importParamaters.join(" ").slice(1, -1);
                componentName = path.basename(fileNameWithoutExtension);
                componentFileName = fileNameWithoutExtension + ".htx";
            }
            // TODO: Improve file path system, because filePath might be considered a folder instead of a file
            components[componentName] = {
                relativePath: path.join(path.dirname(filePath), componentFileName),
                contents: fs.readFileSync(path.join(process.cwd(), path.dirname(filePath), componentFileName), 'utf8')
            };
            charIndex += match[0].length - 1;
            continue;
        }

        if ((match = code.slice(charIndex).match(REGEX.innerChildComponent)) != null) {
            addToOutput(children);
            charIndex += match[0].length;
        }

        // TODO: Component open
        if ((match = code.slice(charIndex).match(REGEX.componentTag.open)) != null) {
            let [tagname, ...dataSplit] = match[0].slice(1, -1).trim().split(" ");
            let data = dataSplit.join(" ").trim();
            componentChildStack.push({
                component: tagname,
                attr: parseHtmlAttributes(data),
                children: ""
            });
            charIndex += match[0].length - 1;
            console.log(`OPEN: ${tagname}`);
            continue;
        }

        // TODO: Component close
        if ((match = code.slice(charIndex).match(REGEX.componentTag.close)) != null) {
            let tagname = match[0].slice(2, -1).trim();
            console.log(componentChildStack);
            let currentChildStackContent = componentChildStack.pop();
            componentChildStack[componentChildStack.length - 1].children += convert(components[currentChildStackContent.component].contents, currentChildStackContent.attr, currentChildStackContent.children, components[currentChildStackContent.component].relativePath, uid++);
            charIndex += match[0].length - 1;
            console.log(`CLOSE: ${tagname}`);
            continue;
        }

        // TODO: Component single
        if ((match = code.slice(charIndex).match(REGEX.componentTag.single)) != null) {
            let [tagname, ...dataSplit] = match[0].slice(1, -2).trim().split(" ");
            let data = dataSplit.join(" ").trim();
            componentChildStack[componentChildStack.length - 1].children += convert(components[tagname].contents, parseHtmlAttributes(data), "", components[tagname].relativePath, uid++);
            charIndex += match[0].length - 1;
            console.log(`SINGLE: ${tagname}`);
            continue;
        }

        if ((match = code.slice(charIndex).match(REGEX.globalVariable)) != null) {
            addToOutput("$" + match[0].slice("$GLOBAL_".length));
            charIndex += match[0].length - 1;
            continue;
        }
        if ((match = code.slice(charIndex).match(REGEX.localVariable)) != null) {
            addToOutput(`$htx_data_${uid}["${match[0].slice(1)}"]`);
            charIndex += match[0].length - 1;
            continue;
        }

        addToOutput(code[charIndex]);
    }
    console.log(componentChildStack);
    return `<?php $htx_data_${uid} = ["props" => ${jsonToPhpFormat(props)}] ?>` + componentChildStack[0].children;
}

let output = convert(CODE, {
    name: "user12"
}, "", "./example/app/index.htx");
fs.writeFileSync("./output.php", output);