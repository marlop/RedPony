const User = require('./schemas/user');
const File = require('./schemas/file');
const App = require('./schemas/app');
const jwt = require('jsonwebtoken');

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config/config.json'));

const findApp = function(token, callback) {
    jwt.verify(token, config.secret, function(err, decoded) {
        if (err) {
            err = new Error('Unable to verify appKey');
            err.status = 500;
            return callback(err, null);
        }

        App.findById(decoded.id, function(err, app) {
            if (err || !app) {
                console.log(err);
                err = new Error('App not found');
                err.status = 500;
                return callback(err, null);
            }

            return callback(null, app);
        })
    })
};

const findUser = function(appKey, token, restrictions, callback) {
    findApp(appKey, function(err, app) {
        if (err) return callback(err, null);
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                err = new Error('Unable to verify user token');
                err.status = 401;
                return callback(err, null);
            }

            User.findOne({_id: decoded.id, app: app.name}, restrictions,
                         function(err, user) {
                if (err || !user) {
                    console.log(err);
                    err = new Error('User not found');
                    err.status = 500;
                    return callback(err, null);
                }
                return callback(null, user);
            })
        })
    })
};

const getToken = function(appKey, email, password, callback) {
    findApp(appKey, function(err, app) {
        if (err) return callback(err, null);
        User.authentication(app.name, email, password, function (error, user) {
            if (error || !user) {
                let err = new Error('Authentication Error: Incorrect email or password');
                err.status = 401;
                return callback(err, null);
            } else {
                let token = jwt.sign({ id: user._id }, config.secret);
                return callback(null, token);
            }
        })
    })
};

const createUser = function createUser(req, res){
    findApp(req.get('appKey'), function(err, app) {
        if (err) return res.json({message: err.message});

        if (req.body.email && req.body.username) {
            let password = "_";
            if (req.body.password) {
                password = req.body.password;
            }
            let data = "";
            if (req.body.data) {
              data = req.body.data;
            }
            let userData = {
                app: app.name,
                email: req.body.email,
                username: req.body.username,
                password: password,
                data: data
            };

            User.create(userData, function(err, user) {
                if (err) {
                    res.status = 401;
                    return res.json({message: err.message});
                } else {
                    let token = jwt.sign({ id: user._id }, config.secret);
                    return res.json({"token": token});
                }
            });
        } else {
            res.status = 401;
            return res.json({message: "Invalid Parameters"});
        }
    })
};

const getUser = function(req, res) {
    if (req.get("appKey")) {
        if (req.get("email")) {
            let password = "_";
            if (req.get("password")) {
                password = req.get("password");
            }
            getToken(req.get("appKey"), req.get("email"), password, function(err, token) {
                if (err) {
                    return res.status(err.status).json({message: err.message});
                }
                return res.json({token: token});
            })
        } else if (req.get("token")) {
            findUser(req.get("appKey"), req.get("token"), {password:0}, function(err, user) {
                if (err) {
                    res.status = 401;
                    return res.json({message: "Could not authenticate user"});
                }
                return res.json(user);
            })
        } else {
            res.status = 406;
            return res.json({message: "No user authentication information provided"})
        }
    } else {
        res.status = 406;
        return res.json({message: "No appKey provided"});
    }
};

const updateUser = function(req, res) {
    if (req.get("appKey") && req.get("token")) {
        findUser(req.get('appKey'), req.get('token'), {}, function(err, user) {
            if (err) {
                res.status = 401;
                return res.json({message: err.message});
            }

            if (req.body.username) user.username = req.body.username;
            if (req.body.password) user.password = req.body.password;
            if (req.body.email) user.email = req.body.email;
            if (req.body.data) user.data = req.body.data;

            user.save(function(err) {
               if (err) {
                   console.log(err);
                   res.status = 401;
                   return res.json({message: "Unable to update user"});
               }
               return res.status(200).send('User updated successfully');
            });
        });
    } else {
        res.status = 401;
        return res.json({message: "no appKey or token provided"});
    }
};

const createFile = function(req, res) {
    if (req.get("appKey") && req.get("token")) {
        findUser(req.get('appKey'), req.get('token'), {}, function(err, user) {
            if (err) {
                res.status = 401;
                return res.json({message: "Could not authenticate user"});
            }

            if (req.body.name && req.body.latitude && req.body.longitude &&
                req.body.expirationDate && req.body.data) {

                let fileData = {
                    owner: user.username,
                    name: req.body.name,
                    location: [
                        req.body.longitude,
                        req.body.latitude
                    ],
                    expireAt: req.body.expirationDate,
                    data: req.body.data
                };

                // TODO: if username is changed, user's files must also be updated
                File.findOne({username: fileData.username, name: fileData.name }, function(err, file){
                    if (err) return res.status(500).json({message: "Error: error checking pre-existing file"});
                    if (file) return res.status(409).json({message: "File already Exists"});
                    if (!file) {
                        File.create(fileData, function(err) {
                            if (err) {
                                console.log(err);
                                return res.status(500).json({message: "Error creating file"});
                            }
                            else return res.json({message:"File created successfully"});
                        });
                    }
                });
            } else {
                let err = new Error("Invalid parameters");
                err.status = 400;
                return res.json({message: err.message});
            }
        });
    } else {
        res.status = 406;
        return res.json({message: "No appKey or token provided"});
    }
};

//Verify if a username is already taken return 200 if user is taken, return 404 if username not found
const checkUserAvailability = function(req, res) {
    let appKey = req.get("appKey");
    let usernameReq = req.query.username;

    if (appKey) {
        //verify appKey
        findApp(appKey, function (err, decoded) {
            if (err) return err;
            let appDecoded = decoded;
            if (appDecoded == null) return res.status(401).json({message: "AppKey Error: Could not authenticate "});
            //check if query is empty
            if (req.query !== {}) {
                User.findOne({username: usernameReq, app: appDecoded.name }, function(err, user) {
                    //if error return error status and message
                    if (err) {
                        console.log(err);
                        err = new Error('query error');
                        err.status = 500;
                        return err;
                    }
                    //if user not found return not found status
                    if (!user)
                    {
                        return res.status(404).json({message: "Not Found: User not found"});
                    }
                    //if user found return request okay status
                    return res.status(200).json({message: "Okay: User with username is found"});
                })
            } else {
                return res.status(400).json({message: "Bad Request: No username parameter"});
            }
        })
    } else {
        return res.status(406).json({message: "No appKey provided"});
    }
};

const getFiles = function(req, res) {
    if (req.get("appKey") && req.get("token")) {
        if (req.get("latitude") && req.get("longitude") && req.get("radius")) {
            findUser(req.get("appKey"), req.get("token"), {}, function(err, user) {
                if (err) {
                    res.status = 500;
                    return res.json({message: "Error finding user"});
                }

                let coordinates = [Number(req.get("longitude")), Number(req.get("latitude"))];
                let radius = Number(req.get("radius"));
                File.getNearby(coordinates, radius, function(err, files) {
                    if (err) {
                        console.log(err);
                        return res.status(err.status).json({message: err.message});
                    }
                    return res.json(files);
                })
            })
        } else {
            findUser(req.get("appKey"), req.get("token"), {}, function(err, user) {
                if (err) {
                    return res.status(err.status).json({message: err.message });
                }
                File.find({owner: user.username}, function(err, files) {
                    if (err) {
                        res.status = 500;
                        return res.json({message: "Error retrieving files"});
                    }
                    if(!files) return res.status(404).json({message: "File not found"});

                    return res.json(files);
                })
            })
        }
    } else {
        res.status = 406;
        return res.json({message: "No appKey or token provided"});
    }
};

const updateFile = function(req, res) {
    if (req.get("appKey") && req.get("token")) {
        findUser(req.get("appKey"), req.get("token"), {}, function(err, user) {
            if (!req.body._id) {
                return res.status(400).json({message: "No file id provided"});
            }
            File.findById(req.body._id, function(err, file) {
                if (err ) {
                    return res.status(500).json({message: "Error retrieving files"});
                }
                if (!file ) {
                    return res.status(404).json({message: "File not found"});
                }

                if (req.body.name) file.name = req.body.name;
                if (req.body.longitude) file.location[0] = Number(req.body.longitude);
                if (req.body.latitude) file.location[1] = Number(req.body.latitude);
                if (req.body.expirationDate) file.expireAt = req.body.expirationDate;
                if (req.body.data) file.data = req.body.data;

                file.save(function(err) {
                   if (err) {
                       return res.status(500).json({message: "Unable to update file"});
                   }
                   return res.status(200).send('File updated successfully');
                });
            })
        })
    } else {
        res.status = 406;
        return res.json({message: "No appKey or token provided"});
    }
};

const deleteFile = function(req, res) {
    let appKey = req.get("appKey");
    let token = req.get("token");
    let fileid = req.body.fileid;

    if (appKey && token) {
        findApp(appKey, function (err, decoded) {
            if (err) return err;
            if (decoded == null) return res.status(400).json({message: "Appkey error"});

            findUser(appKey, token, function(err){
                if (err) return err;
                File.findByIdAndRemove(fileid, function(err) {
                    if (err) return err;
                    else {
                        return res.status(200).json({message: "File Deleted"});
                    }
                })
            })
        })

    } else {
        return res.status(401).json({message: "No appKey or token provided"});
    }

};

const deleteUser = function(req, res) {
    let appKey = req.get("appKey");
    let token = req.get("token");

    if (appKey && token) {
        findApp(appKey, function (err, decoded) {
            if (err) return err;
            if (decoded == null) return res.status(400).json({message: "Appkey error"});

            findUser(appKey, token, function(err, user){
                if (err) return err;
                User.findByIdAndRemove(user._id, function(err) {
                    if (err) return err;
                    else {
                        return res.status(200).json({message: "User Deleted"});
                    }
                })
            })
        })

    } else {
        return res.status(401).json({message: "No appKey or token provided"});
    }
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  createFile,
  getFiles,
  updateFile,
  checkUserAvailability,
    deleteUser,
    deleteFile
};
