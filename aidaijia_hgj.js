; (function (global) {
	if (!global.aidaijia) {
		global.aidaijia = {};
	}
	var aidaijia = global.aidaijia;
	if (aidaijia._instanceExists) {
		return;
	}
	aidaijia._instanceExists = true;

	var jq = global.jQuery;
	var jsn = global.JSON;
	var optstr = jq("script#aidaijiajsnode").attr("data-init");
	var defaultOptions = optstr ? jsn.parse(optstr) : { clientOptions: 2 };

	jq.extend(defaultOptions, aidaijia);
	jq.extend(aidaijia, defaultOptions);

	var properties = {
		currentAgent: null,
		agentVersion: null,
		currentUser: null,
		_userReady: false,
		_serverUser: null,
		_serverReady: false,
	};
	jq.extend(aidaijia, properties, {
		__events: { user: [], server: [] },
		__emitready: function(ct) {
			var list = aidaijia.__events[ct], fn;
			if (list) {
				list = list.splice(0, list.length);
				while ((fn = list.shift())) {
					fn(aidaijia);
				}
			}
		},
		userReady: function (fn) {
			aidaijia.__events["user"].push(fn);
			if (aidaijia._userReady) {
				aidaijia.__emitready("user");
			}
		},
		serverReady: function (fn) {
			aidaijia.__events["server"].push(fn);
			if (aidaijia._serverReady) {
				aidaijia.__emitready("server");
			}
		}
	});

	var setup = function(json, base64, $) {
		var ua = global.navigator.userAgent.toLowerCase();
		var _agent = null;
		if (ua.match(/aidaijia_android/i) == "aidaijia_android") {
			_agent = "_android";
		} else if (ua.match(/aidaijia_ios/i) == "aidaijia_ios") {
			_agent = "_ios";
		}

		var mts = {
			_insideWeixin: ua.match(/MicroMessenger/i) == "micromessenger",
			currentAgent: _agent,
			_android: {
				callHost: function(host, func, args, callback) {
					if (json && json.stringify && base64) {
						var msg = json.stringify({ host: host, func: func, args: args, callback: callback });
						msg = base64.encode(msg);
						global.location.href = "https://i.aidaijia.com/clientcall/?_call_=" + msg;
					}
				}
			},
			_ios: {
				callHost: function(host, func, args, callback) {
					if (json && json.stringify && base64) {
						var msg = json.stringify({ host: host, func: func, args: args, callback: callback });
						msg = base64.encode(msg);
						global.location.href = "https://i.aidaijia.com/clientcall/?_call_=" + msg;
					}
				}
			},
			callbacks: {},
			_callback: function (fk, result) {
				if (!fk) {
					return;
				}
				var cx = aidaijia.callbacks[fk];
				if (typeof cx != "function") {
					return;
				}
				if (result) {
					if (json && json.parse) {
						result = json.parse(result);
					} else {
						return;
					}
				}
				alert("result="+result);
				aidaijia.callbacks[fk] = null;
				cx(result);
			},
			callHost: function (host, func, args, callback) {
				if (!aidaijia.currentAgent) {
					return;
				}
				var agent = aidaijia[aidaijia.currentAgent];
				if (!agent) {
					return;
				}
				if (typeof callback == "function") {//包装下
					var fk = "_" + (new Date().getTime());
					aidaijia.callbacks[fk] = callback;
					callback = fk;
				} else {
					callback = null;
				}
				agent.callHost(host, func, args, callback);
			},
			_loginFromApp: function () {
				var vcode = "" + (new Date().getTime());
				var userId = 0;
				if(aidaijia._serverUser && aidaijia._serverUser.UserID) {
					userId = aidaijia._serverUser.UserID;
				}
				aidaijia.callHost('UserHost', 'clientLogin', [
					{ name: "validationCode", value: vcode, type: "string" },
					{ name: "userId", value: userId, type: "long" },
					{ name: "options", value: aidaijia.clientOptions, type: "int" }
				], function (result) {
					if (result.ResultNo == 0) {
						var user = result.ResultAttachObject;
						if (user != null) {
							aidaijia.currentUser = aidaijia._serverUser;
							aidaijia._userReady = true;
							aidaijia.__emitready("user");
							return;
						}
						if (result.ResultDescription) {
							$.post("/Services/WebService/WebLogin", { ticket: result.ResultDescription, validationCode: vcode }, function(data) {
								if (data.ResultNo == 0) {
									aidaijia.currentUser = aidaijia._serverUser = data.ResultAttachObject;
								}
								aidaijia._userReady = true;
								aidaijia.__emitready("user");
							});
						} else {
							aidaijia._userReady = true;
							aidaijia.__emitready("user");
						}
					} else {
						aidaijia._userReady = true;
						aidaijia.__emitready("user");
					}
				});
			},

			clientHost: {
				showMenu: function(showMenu, callback) {
					if (!aidaijia.currentAgent) {
						return;
					}
					aidaijia.callHost('ClientHost', 'showMenu', [{ name: "showMenu", value: showMenu, type: "boolean" }], callback);
				},
				startPage: function(parameters) {
					if (!aidaijia.currentAgent) {
						return;
					}
					aidaijia.callHost('ClientHost', 'startPage', [{ name: "parameters", value: json.stringify(parameters), type: "string" }]);
				},
				showActionBar: function (show, callback) {
					if (!aidaijia.currentAgent) {
						return;
					}
					aidaijia.callHost('ClientHost', 'showActionBar', [{ name: "show", value: show, type: "boolean" }], callback);
				},
				closePage: function (callback) {
					if (!aidaijia.currentAgent) {
						return;
					}
					aidaijia.callHost('ClientHost', 'closePage', null, callback);
				},
			},
		};
		$.extend(aidaijia, mts);
		//尝试自动登录
		aidaijia.serverReady(function () {
			if(aidaijia._serverUser) {//已登录
				if(aidaijia._serverUser["From"] == "UserLogin") {//主动登录的
					aidaijia.currentUser = aidaijia._serverUser;
					aidaijia._userReady = true;
					aidaijia.__emitready("user");
					return;
				}
			}
			if(aidaijia.currentAgent) {
				//尝试验证当前用户身份或从APP内登录
				aidaijia._loginFromApp();
			} else {//显示登录对话框
				aidaijia._userReady = true;
				aidaijia.__emitready("user");
			}
		});
		//获取当前用户
		/*$(function () {
			$.post("/Services/WebService/GetCurrentUser", function (data) {
				aidaijia._serverUser = data.ResultAttachObject;
				if(aidaijia._serverUser) {
					aidaijia._serverUser["From"] = data.ResultDescription;
				}
				aidaijia._serverReady = true;
				aidaijia.__emitready("server");
			});
		});*/
	};

	setup(global.JSON, global.Base64, global.jQuery);
})(this);