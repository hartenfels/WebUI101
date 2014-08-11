webUi = ($) ->
    # These should probably be @types and @urls, but that don't work.
    types_ = method_ = menu_ = undefined


    ### Right now this is the only available method. Alternative methods could
    be WebSockets or Comet. ###
    ajax =
        buildTree : ->
            $msg = addMessage('Getting tree...', 'load')
            $.post(method_.tree_url, {type : 'tree'})
            .done (data) ->
                try
                    data  = [data] if not $.isArray(data)
                    nodes = nodesFromData(data)
                    $('#tree').jstree
                        core        :
                            data           : nodes
                            check_callback : handleDrag
                        contextmenu :
                            items : menu_
                        dnd         :
                            check_while_dragging : false
                            copy                 : false
                        plugins     : [
                            'contextmenu'
                            'dnd'
                            'types'
                            'wholerow'
                            ]
                        types       : types_
                catch e
                    addMessage("Fatal Error: #{e}", 'error')
            .fail   -> addMessage('Fatal Error: Could not get tree.', 'error')
            .always -> removeMessage($msg)
            .always    handleMessages

        executeAction : ($msg, key, id, target, pos) ->
            action =
                type : key
                id   : id
            action.target = target if target?
            action.pos    = pos    if pos?
            url = method_.action_urls[key] or
                throw "ajax: no URL for action #{key}."
            $.post(url, action)
            .done (data)    -> handleCommands(data)
            .fail (_, s, e) -> notice("#{s}: #{e}", 'error')
            .always         -> removeMessage($msg)
            .always            handleMessages

        getFormBase : (command) ->
            url   = command.submit or throw 'ajax: No form URL.'
            $form = $('<form></form>')
            $form.submit (event) ->
                event.preventDefault()
                $msg = addMessage("Submitting #{command.title || 'form'}...",
                                  'load')
                $.post(url, $form.serialize())
                .done (data)    -> handleCommands(data)
                .done (data)    -> handleForm($form, data)
                .fail (_, s, e) -> notice("#{s}: #{e}", 'error')
                .always         -> removeMessage($msg)
                .always            handleMessages


    executeAction = (label, key, node) ->
        $msg = addMessage("Executing #{label}...", 'load')
        try
            id = $('#tree').jstree().get_node(node.reference).id
            method_.executeAction($msg, key, id)
        catch e
            removeMessage($msg)
            notice(e, 'error')
        return


    ### addMessage(Str text, Str classes?)
    Shows a message with the given text. Additional CSS classes may be given as
    a space-separated string. Returns the message's $div. ###
    addMessage = (text, classes) ->
        $div = $('<div class="message"></div>').text(text).hide()
        $div.addClass(classes) if classes
        $div.appendTo('#messages').slideDown()


    ### removeMessage($div)
    Hides and removes the given message. Returns the $div to be removed after
    it gets done sliding up, whatever good that'll do ya. ###
    removeMessage = ($div) ->
        $div.slideUp({complete : -> $div.remove()})


    ### notice(Str text, Str classes?)
    Dispatches to addMessage, waits five seconds and then calls removeMessage.
    Happens to return the timeout ID of the five-second wait. ###
    notice = (text, classes) ->
        $div = addMessage(text, classes)
        setTimeout((-> removeMessage($div)), 5000)


    ### handleMessage(Str|{Str :text, Str :type} msg)
    Defers to notice. I can't explain it simpler or shorter than the code. ###
    handleMessage = (msg) ->
        if   typeof(msg) is 'string'
        then notice(msg)
        else notice(msg.text, msg.type)
        return


    ### handleMessages({Object|[Object] :messages} data)
    Defers to handleMessage for each message in the given data, if that object
    has a ``messages'' property. It may either be a single message or an array
    of them. ###
    handleMessages = (data) ->
        if data && 'messages' of data && messages = data.messages
            if   $.isArray(messages)
            then handleMessage(msg) for msg in messages
            else handleMessage(messages)
        return


    commandHandlers =
        add  : (command) ->
            $tree  = $('#tree').jstree()
            id     = command.parent     or throw 'Missing parent ID.'
            parent = $tree.get_node(id) or throw "#{id} does not exist."
            node   = command.node       or throw 'Missing node.'
            $tree.create_node(parent, nodeFromData(node))
            return

        edit : (command) ->
            $tree      = $('#tree').jstree()
            cmdNode    = command.node       or throw 'Missing node.'
            id         = cmdNode.id         or throw 'Missing ID.'
            node       = $tree.get_node(id) or throw "#{id} does not exist."
            cmdNode[k] = v unless k of cmdNode for k, v of node
            edit       = nodeFromData(cmdNode)
            node[k]    = v for k, v of edit
            return

        move : (command) ->
            $tree  = $('#tree').jstree()
            sid    = command.source         or throw 'Missing source ID.'
            tid    = command.target         or throw 'Missing target ID.'
            source = $tree.get_node(sid)    or throw "#{sid} does not exist."
            target = $tree.get_node(tid)    or throw "#{tid} does not exist."
            pos    = command.pos || 'last'
            $tree.settings.core.check_callback = true
            $tree.move_node(source, target, pos)
            $tree.settings.core.check_callback = handleDrag
            return

        delete : (command) ->
            id = command.id                     or throw 'Missing ID.'
            $('#tree').jstree().delete_node(id) or throw "#{id} does not exist."
            return

        form : (command) ->
            title = command.title || 'form'
            $form = method_.getFormBase(command).attr('title', title)

            for field in command.fields
                throw 'Missing name.' if not field.name
                $div = $('<div></div>').attr('name', "#{field.name}")
                                       .appendTo($form)
                $('<label></label>').attr('for', field.name)
                                    .text(field.label || field.name)
                                    .appendTo($div)
                $('<input>').attr('name', field.name)
                            .val(field.value || '')
                            .appendTo($div)
                $('<div></div>').attr('name', "#{field.name}-error")
                                .addClass('field-message')
                                .hide()
                                .appendTo($div)

            $form.dialog
                buttons :
                    Submit : -> $form.submit()
                    Cancel : -> $form.dialog('close')
                close   : -> $form.remove()
                show    : 'slideDown'
                hide    : 'slideUp'
            return

    handleCommand = (command) ->
        type = ''
        try
            throw 'Missing type.'         unless 'type' of command
            type = command.type           or throw 'Empty type.'
            throw "Unknown type: #{type}" unless  type  of commandHandlers
            commandHandlers[type](command)
        catch e
            notice("Error handling #{type} command: #{e}", 'error')


    handleCommands = (data) ->
        if data && 'commands' of data && commands = data.commands
            if $.isArray(commands)
            then handleCommand(com) for com in commands
            else handleCommand(commands)
        $('#tree').jstree().redraw(true)


    handleForm = ($form, data) ->
        if data && 'form' of data && f = data.form
            if f.valid
                $form.dialog('close')
            else if f.errors
                $form.find("div[name=#{k}]").removeClass('field-error')
                     .find('.field-message').slideUp()
                for k, v of f.errors
                    $form.find("div[name=#{k}]")
                         .addClass('field-error')
                         .find('.field-message')
                         .text(v).stop().slideUp().slideDown()


    handleDrag = (op, node, parent, pos) ->
        if op is 'move_node'
            ts = types_[parent.type]
            if ts && ts.children && node.type in ts.children
                $msg = addMessage("Restructuring...", 'load')
                try
                    method_.executeAction($msg, 'restructure',
                                          node.id, parent.id, pos)
                catch e
                    removeMessage($msg)
                    notice(e, 'error')
            else
                notice("Restructuring Error: #{node.type} can't
                        be child of #{parent.type}.", 'error')
            return false
        return true


    nodeFromData = (data) ->
        type = types_[data.type] or throw "Unknown type: #{data.type}"
        if ('printf' of type)
            args      = []
            args[i]   = data[arg] for arg, i in type.printf.args
            formatted = vsprintf(type.printf.format, args)
        node =
            type     : data.type
            id       : data.id
            text     : formatted || data.text
        node.state    = data.state                   if 'state'    of data
        node.children = nodesFromData(data.children) if 'children' of data
        return node


    nodesFromData = (list) ->
        nodes = []
        nodes.push(nodeFromData(n)) for n in list
        return nodes


    buildAction = (key, value, separator) ->
        a = {}
        if typeof value is 'string'
            a.label = value
        else
            a.label = value.text or throw "Missing text for action #{k}"
            a.icon  = value.icon if 'icon' of value
        a.separator_before = true if separator
        a.action           = (node) -> executeAction(a.label, key, node)
        return a

    buildMenu = (types, actions) ->
        menus     = {}
        separator = false
        for t, v of types
            menus[t] = {}
            for a in v.actions
                if a
                    throw "Unknown action: #{a}" if not a of actions
                    menus[t][a] = buildAction(a, actions[a], separator)
                    separator   = false
                else
                    separator   = true
        return (node) -> menus[node.type]

    ### init()
    Loads the configuration information from the server via AJAX and then does
    a bunch of ugly error checking. If it's happy with the result, it defers to
    buildTree. Otherwise it shows a message and the script dies. Then you go
    fix your broken server code. ###
    init = ->
        $msg = addMessage('Getting server configuration...', 'load')
        $.post('/', {type : 'config'})
        .done ({method, types, actions}) ->
            try
                errs = []

                switch method.name
                    when 'ajax'
                        'tree_url'    of method or
                            errs.push('ajax missing tree_url.'   )
                        'action_urls' of method or
                            errs.push('ajax missing action_urls.')
                        break if errs.length
                        ajax.tree_url    = method.tree_url
                        ajax.action_urls = method.action_urls
                        method_          = ajax
                    else
                        errs.push("Unsupported method: #{method.name}")

                errs.push('Server did not return valid types.'  ) unless types
                errs.push('Server did not return valid actions.') unless actions

                throw errs if errs.length
                types_ = types
                menu_  = buildMenu(types, actions)
                method_.buildTree()

            catch es
                if $.isArray(es)
                    addMessage("Fatal Error: #{e}",  'error') for e in es
                else
                    addMessage("Fatal Error: #{es}", 'error')
                throw es
            return
        .fail   -> addMessage("Fatal Error: Couldn't get server info", 'error')
        .always -> removeMessage($msg)
        .always    handleMessages

if jQuery?
    jQuery(webUi(jQuery))
    jQuery(-> jQuery('#no-js').remove())
else
    window.onload = ->
        document.getElementById('no-js').innerHTML =
                'Error: jQuery is missing. This may be because the library
                 could not be loaded from Google Hosted Libraries.'
