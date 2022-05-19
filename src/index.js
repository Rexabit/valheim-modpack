var fs = require('fs');
var path = require('path');

async function ReadDirectory(directory) {
  let all = [];

  var dirents = await fs.promises.readdir(directory, {
    withFileTypes: true
  });

  for (let i = 0; i < dirents.length; i++ ) {
    let d = dirents[i];
    
    if (d.isDirectory()) {
      all.push(... await ReadDirectory(directory + "/" + d.name));
    } else {
      all.push({ path: directory + "/" + d.name, dirent: d })
    }
  }

  return all;
}

async function GetGroups(directory) {
  let dirents = await ReadDirectory(directory);

  let matcher = new RegExp("lib\/extensions\/(.*)\/(.*)\/(.*)\/(.+)")
  let groups = {};

  for (let i = 0; i < dirents.length; i++) {
    let d = dirents[i];
    let result = matcher.exec(d.path);

    if (!result) {
      continue;
    }

    let rootMod = result[1];
    //let extMod  = result[2];
    let jsonFile = result[3];

    if (!groups[jsonFile]){
      groups[jsonFile] = {
        rules: directory + "/" + rootMod + "/" + jsonFile + ".json",
        write: "test/" + rootMod + "/" + jsonFile + ".json",
        segments: []
      };
    }

    let content = await fs.promises.readFile(d.path, {
      encoding: "utf8"
    });

    groups[jsonFile].segments.push({
      path: d.path,
      content: content
    });
  }

  return groups;
}

async function GetRules(extension) {
  try {
    let content = await fs.promises.readFile(extension, {
      encoding: "utf8"
    })

    return JSON.parse(content) 
  } catch(err) {
    console.log(err);
  }

  return {}
}

function GetRule(object, key, rules) {
  let keys = Object.keys(object);

  for (let i = 0; i < keys.length; i++) {
    if (rules[key + ".*." + keys[i]]) {
      return {
        attribute: keys[i],
        action: rules[key + ".*." + keys[i]]
      }
    }
  }

  return {
    attribute: null,
    action: "None"
  }
}

function MergeArrays(array, root, key, rules, force) {
  for (let i = 0; i < array.length; i++) {
    let item = array[i];

    if (typeof(item) === 'object' && !force) {
      let rule = GetRule(item, key, rules)

      switch (rule.action) {
        case "Merge": {
          let exists = false;

          for (let j = 0; j < root.length; j++) {
            if (root[j][rule.attribute] === item[rule.attribute]) {
              exists = true;
              Assign(item, root[j], rules, true);
            }
          } 

          if (!exists) {
            root.push(item);
          }
        }
      }
    } else {
      root.push(item);
    }
  }
}

function Assign(object, root, rules, force) {
  Object.keys(object).forEach((key) => {
    if (root[key]) {
      if (Array.isArray(root[key])) {
        MergeArrays(object[key], root[key], key, rules, force)
      } else if (typeof(root[key]) === 'object') {
        Assign(object[key], root[key], rules);
      }
    }
  })
}

GetGroups("lib/extensions").then(async (groups) => {
  Object.keys(groups).forEach(async (v) => {
    let rules = await GetRules(groups[v].rules);
    let segments = groups[v].segments;

    let root = {};

    for (let i = 0; i < segments.length; i++) {
      let object = JSON.parse(segments[i].content);

      if (i == 0) {
        root = object;

        continue;
      }

      Assign(object, root, rules);
    }

    //console.log(JSON.stringify(root));

    fs.mkdirSync(path.dirname(groups[v].write), { recursive: true});

    await fs.promises.writeFile(groups[v].write, JSON.stringify(root), {
      flag: "w"
    })
  })
});