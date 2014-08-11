// Generated by CoffeeScript 1.7.1
(function() {
  var webUi,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  webUi = function($) {
    var addMessage, ajax, buildAction, buildMenu, commandHandlers, executeAction, handleCommand, handleCommands, handleDrag, handleForm, handleMessage, handleMessages, init, menu_, method_, nodeFromData, nodesFromData, notice, removeMessage, types_;
    types_ = method_ = menu_ = void 0;

    /* Right now this is the only available method. Alternative methods could
    be WebSockets or Comet.
     */
    ajax = {
      buildTree: function() {
        var $msg;
        $msg = addMessage('Getting tree...', 'load');
        return $.post(method_.tree_url, {
          type: 'tree'
        }).done(function(data) {
          var e, nodes;
          try {
            if (!$.isArray(data)) {
              data = [data];
            }
            nodes = nodesFromData(data);
            return $('#tree').jstree({
              core: {
                data: nodes,
                check_callback: handleDrag
              },
              contextmenu: {
                items: menu_
              },
              dnd: {
                check_while_dragging: false,
                copy: false
              },
              plugins: ['contextmenu', 'dnd', 'types', 'wholerow'],
              types: types_
            });
          } catch (_error) {
            e = _error;
            return addMessage("Fatal Error: " + e, 'error');
          }
        }).fail(function() {
          return addMessage('Fatal Error: Could not get tree.', 'error');
        }).always(function() {
          return removeMessage($msg);
        }).always(handleMessages);
      },
      executeAction: function($msg, key, id, target, pos) {
        var action, url;
        action = {
          type: key,
          id: id
        };
        if (target != null) {
          action.target = target;
        }
        if (pos != null) {
          action.pos = pos;
        }
        url = method_.action_urls[key] || (function() {
          throw "ajax: no URL for action " + key + ".";
        })();
        return $.post(url, action).done(function(data) {
          return handleCommands(data);
        }).fail(function(_, s, e) {
          return notice("" + s + ": " + e, 'error');
        }).always(function() {
          return removeMessage($msg);
        }).always(handleMessages);
      },
      getFormBase: function(command) {
        var $form, url;
        url = command.submit || (function() {
          throw 'ajax: No form URL.';
        })();
        $form = $('<form></form>');
        return $form.submit(function(event) {
          var $msg;
          event.preventDefault();
          $msg = addMessage("Submitting " + (command.title || 'form') + "...", 'load');
          return $.post(url, $form.serialize()).done(function(data) {
            return handleCommands(data);
          }).done(function(data) {
            return handleForm($form, data);
          }).fail(function(_, s, e) {
            return notice("" + s + ": " + e, 'error');
          }).always(function() {
            return removeMessage($msg);
          }).always(handleMessages);
        });
      }
    };
    executeAction = function(label, key, node) {
      var $msg, e, id;
      $msg = addMessage("Executing " + label + "...", 'load');
      try {
        id = $('#tree').jstree().get_node(node.reference).id;
        method_.executeAction($msg, key, id);
      } catch (_error) {
        e = _error;
        removeMessage($msg);
        notice(e, 'error');
      }
    };

    /* addMessage(Str text, Str classes?)
    Shows a message with the given text. Additional CSS classes may be given as
    a space-separated string. Returns the message's $div.
     */
    addMessage = function(text, classes) {
      var $div;
      $div = $('<div class="message"></div>').text(text).hide();
      if (classes) {
        $div.addClass(classes);
      }
      return $div.appendTo('#messages').slideDown();
    };

    /* removeMessage($div)
    Hides and removes the given message. Returns the $div to be removed after
    it gets done sliding up, whatever good that'll do ya.
     */
    removeMessage = function($div) {
      return $div.slideUp({
        complete: function() {
          return $div.remove();
        }
      });
    };

    /* notice(Str text, Str classes?)
    Dispatches to addMessage, waits five seconds and then calls removeMessage.
    Happens to return the timeout ID of the five-second wait.
     */
    notice = function(text, classes) {
      var $div;
      $div = addMessage(text, classes);
      return setTimeout((function() {
        return removeMessage($div);
      }), 5000);
    };

    /* handleMessage(Str|{Str :text, Str :type} msg)
    Defers to notice. I can't explain it simpler or shorter than the code.
     */
    handleMessage = function(msg) {
      if (typeof msg === 'string') {
        notice(msg);
      } else {
        notice(msg.text, msg.type);
      }
    };

    /* handleMessages({Object|[Object] :messages} data)
    Defers to handleMessage for each message in the given data, if that object
    has a ``messages'' property. It may either be a single message or an array
    of them.
     */
    handleMessages = function(data) {
      var messages, msg, _i, _len;
      if (data && 'messages' in data && (messages = data.messages)) {
        if ($.isArray(messages)) {
          for (_i = 0, _len = messages.length; _i < _len; _i++) {
            msg = messages[_i];
            handleMessage(msg);
          }
        } else {
          handleMessage(messages);
        }
      }
    };
    commandHandlers = {
      add: function(command) {
        var $tree, id, node, parent;
        $tree = $('#tree').jstree();
        id = command.parent || (function() {
          throw 'Missing parent ID.';
        })();
        parent = $tree.get_node(id) || (function() {
          throw "" + id + " does not exist.";
        })();
        node = command.node || (function() {
          throw 'Missing node.';
        })();
        $tree.create_node(parent, nodeFromData(node));
      },
      edit: function(command) {
        var $tree, cmdNode, edit, id, k, node, v;
        $tree = $('#tree').jstree();
        cmdNode = command.node || (function() {
          throw 'Missing node.';
        })();
        id = cmdNode.id || (function() {
          throw 'Missing ID.';
        })();
        node = $tree.get_node(id) || (function() {
          throw "" + id + " does not exist.";
        })();
        if (!(function() {
          var _results;
          _results = [];
          for (k in node) {
            v = node[k];
            _results.push(k in cmdNode);
          }
          return _results;
        })()) {
          cmdNode[k] = v;
        }
        edit = nodeFromData(cmdNode);
        for (k in edit) {
          v = edit[k];
          node[k] = v;
        }
      },
      move: function(command) {
        var $tree, pos, sid, source, target, tid;
        $tree = $('#tree').jstree();
        sid = command.source || (function() {
          throw 'Missing source ID.';
        })();
        tid = command.target || (function() {
          throw 'Missing target ID.';
        })();
        source = $tree.get_node(sid) || (function() {
          throw "" + sid + " does not exist.";
        })();
        target = $tree.get_node(tid) || (function() {
          throw "" + tid + " does not exist.";
        })();
        pos = command.pos || 'last';
        $tree.settings.core.check_callback = true;
        $tree.move_node(source, target, pos);
        $tree.settings.core.check_callback = handleDrag;
      },
      "delete": function(command) {
        var id;
        id = command.id || (function() {
          throw 'Missing ID.';
        })();
        $('#tree').jstree().delete_node(id) || (function() {
          throw "" + id + " does not exist.";
        })();
      },
      form: function(command) {
        var $div, $form, field, title, _i, _len, _ref;
        title = command.title || 'form';
        $form = method_.getFormBase(command).attr('title', title);
        _ref = command.fields;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          if (!field.name) {
            throw 'Missing name.';
          }
          $div = $('<div></div>').attr('name', "" + field.name).appendTo($form);
          $('<label></label>').attr('for', field.name).text(field.label || field.name).appendTo($div);
          $('<input>').attr('name', field.name).val(field.value || '').appendTo($div);
          $('<div></div>').attr('name', "" + field.name + "-error").addClass('field-message').hide().appendTo($div);
        }
        $form.dialog({
          buttons: {
            Submit: function() {
              return $form.submit();
            },
            Cancel: function() {
              return $form.dialog('close');
            }
          },
          close: function() {
            return $form.remove();
          },
          show: 'slideDown',
          hide: 'slideUp'
        });
      }
    };
    handleCommand = function(command) {
      var e, type;
      type = '';
      try {
        if (!('type' in command)) {
          throw 'Missing type.';
        }
        type = command.type || (function() {
          throw 'Empty type.';
        })();
        if (!(type in commandHandlers)) {
          throw "Unknown type: " + type;
        }
        return commandHandlers[type](command);
      } catch (_error) {
        e = _error;
        return notice("Error handling " + type + " command: " + e, 'error');
      }
    };
    handleCommands = function(data) {
      var com, commands, _i, _len;
      if (data && 'commands' in data && (commands = data.commands)) {
        if ($.isArray(commands)) {
          for (_i = 0, _len = commands.length; _i < _len; _i++) {
            com = commands[_i];
            handleCommand(com);
          }
        } else {
          handleCommand(commands);
        }
      }
      return $('#tree').jstree().redraw(true);
    };
    handleForm = function($form, data) {
      var f, k, v, _ref, _results;
      if (data && 'form' in data && (f = data.form)) {
        if (f.valid) {
          return $form.dialog('close');
        } else if (f.errors) {
          $form.find("div[name=" + k + "]").removeClass('field-error').find('.field-message').slideUp();
          _ref = f.errors;
          _results = [];
          for (k in _ref) {
            v = _ref[k];
            _results.push($form.find("div[name=" + k + "]").addClass('field-error').find('.field-message').text(v).stop().slideUp().slideDown());
          }
          return _results;
        }
      }
    };
    handleDrag = function(op, node, parent, pos) {
      var $msg, e, ts, _ref;
      if (op === 'move_node') {
        ts = types_[parent.type];
        if (ts && ts.children && (_ref = node.type, __indexOf.call(ts.children, _ref) >= 0)) {
          $msg = addMessage("Restructuring...", 'load');
          try {
            method_.executeAction($msg, 'restructure', node.id, parent.id, pos);
          } catch (_error) {
            e = _error;
            removeMessage($msg);
            notice(e, 'error');
          }
        } else {
          notice("Restructuring Error: " + node.type + " can't be child of " + parent.type + ".", 'error');
        }
        return false;
      }
      return true;
    };
    nodeFromData = function(data) {
      var arg, args, formatted, i, node, type, _i, _len, _ref;
      type = types_[data.type] || (function() {
        throw "Unknown type: " + data.type;
      })();
      if ('printf' in type) {
        args = [];
        _ref = type.printf.args;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          arg = _ref[i];
          args[i] = data[arg];
        }
        formatted = vsprintf(type.printf.format, args);
      }
      node = {
        type: data.type,
        id: data.id,
        text: formatted || data.text
      };
      if ('state' in data) {
        node.state = data.state;
      }
      if ('children' in data) {
        node.children = nodesFromData(data.children);
      }
      return node;
    };
    nodesFromData = function(list) {
      var n, nodes, _i, _len;
      nodes = [];
      for (_i = 0, _len = list.length; _i < _len; _i++) {
        n = list[_i];
        nodes.push(nodeFromData(n));
      }
      return nodes;
    };
    buildAction = function(key, value, separator) {
      var a;
      a = {};
      if (typeof value === 'string') {
        a.label = value;
      } else {
        a.label = value.text || (function() {
          throw "Missing text for action " + k;
        })();
        if ('icon' in value) {
          a.icon = value.icon;
        }
      }
      if (separator) {
        a.separator_before = true;
      }
      a.action = function(node) {
        return executeAction(a.label, key, node);
      };
      return a;
    };
    buildMenu = function(types, actions) {
      var a, menus, separator, t, v, _i, _len, _ref;
      menus = {};
      separator = false;
      for (t in types) {
        v = types[t];
        menus[t] = {};
        _ref = v.actions;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          a = _ref[_i];
          if (a) {
            if (!a in actions) {
              throw "Unknown action: " + a;
            }
            menus[t][a] = buildAction(a, actions[a], separator);
            separator = false;
          } else {
            separator = true;
          }
        }
      }
      return function(node) {
        return menus[node.type];
      };
    };

    /* init()
    Loads the configuration information from the server via AJAX and then does
    a bunch of ugly error checking. If it's happy with the result, it defers to
    buildTree. Otherwise it shows a message and the script dies. Then you go
    fix your broken server code.
     */
    return init = function() {
      var $msg;
      $msg = addMessage('Getting server configuration...', 'load');
      return $.post('/', {
        type: 'config'
      }).done(function(_arg) {
        var actions, e, errs, es, method, types, _i, _len;
        method = _arg.method, types = _arg.types, actions = _arg.actions;
        try {
          errs = [];
          switch (method.name) {
            case 'ajax':
              'tree_url' in method || errs.push('ajax missing tree_url.');
              'action_urls' in method || errs.push('ajax missing action_urls.');
              if (errs.length) {
                break;
              }
              ajax.tree_url = method.tree_url;
              ajax.action_urls = method.action_urls;
              method_ = ajax;
              break;
            default:
              errs.push("Unsupported method: " + method.name);
          }
          if (!types) {
            errs.push('Server did not return valid types.');
          }
          if (!actions) {
            errs.push('Server did not return valid actions.');
          }
          if (errs.length) {
            throw errs;
          }
          types_ = types;
          menu_ = buildMenu(types, actions);
          method_.buildTree();
        } catch (_error) {
          es = _error;
          if ($.isArray(es)) {
            for (_i = 0, _len = es.length; _i < _len; _i++) {
              e = es[_i];
              addMessage("Fatal Error: " + e, 'error');
            }
          } else {
            addMessage("Fatal Error: " + es, 'error');
          }
          throw es;
        }
      }).fail(function() {
        return addMessage("Fatal Error: Couldn't get server info", 'error');
      }).always(function() {
        return removeMessage($msg);
      }).always(handleMessages);
    };
  };

  if (typeof jQuery !== "undefined" && jQuery !== null) {
    jQuery(webUi(jQuery));
    jQuery(function() {
      return jQuery('#no-js').remove();
    });
  } else {
    window.onload = function() {
      return document.getElementById('no-js').innerHTML = 'Error: jQuery is missing. This may be because the library could not be loaded from Google Hosted Libraries.';
    };
  }

}).call(this);