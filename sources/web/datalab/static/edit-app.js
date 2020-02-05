define(() => {
  function postLoad(ipy, editor, savewidget, events) {
    function navigateAlternate(alt) {
      var url = document.location.href.replace('/edit', alt);
      if (url.includes("?")) {
        url = url.slice(0, url.lastIndexOf("?"));
      }
      url = url + '?download=true';

      if (!editor.clean) {
        editor.save().then(function() {
          window.open(url);
        });
      }
      else {
        window.open(url);
      }
    }

    $('#saveButton').click(function() {
      editor.save();
    })

    $('#renameButton').click(function() {
      new savewidget.SaveWidget('span#save_widget', { editor: editor, events: events }).rename();
    })

  return {
    postLoad: postLoad
  };
});
