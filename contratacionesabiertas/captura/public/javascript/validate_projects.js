(() => {
    let modalAdmin = $('#adminModal');
    let modal = $('#genericModal');

    modalAdmin.off('click', '[data-validar]');
    modalAdmin.off('click', '[data-publicar]');
    modalAdmin.off('click', '[data-pnt]');
    modalAdmin.off('click', '[data-json]');
    modalAdmin.off('submit', '#frmSearchValidations');

    let refresh = () => {
        modalAdmin.find('#modal_content').load('/validate-process/');
    }

    let search = function() {
        if(modalAdmin.find('#frmSearchValidations').length > 0){
            let params = modalAdmin.find('#frmSearchValidations').serializeJSON();
            $.ajax({
                type: 'post',
                url: '/validate-process/search',
                data: params,
                success: data => {

                    let $tbody = modalAdmin.find('tbody').empty();
                    data.map(rec => {
                        let $tr = $(generateRowHtml(rec));
                        $tr.find('button[data-validate]').click(() => validateProcess(rec.id));
                        $tr.find('button[data-edit]').click(() => location = '/main/' + rec.id);
                        $tr.find('button[data-publish]').click(() => publish(rec.id));
                        $tr.find('button[data-pnt]').click(() => sendPnt(rec.id));
                        $tr.find('button[data-data_pnt]').click(() => showDataPnt(rec.id));
                        $tr.appendTo($tbody);
                    });
                },
                error: req => alert(req.responseJSON.message)
            });
        }
    }

    let publish = cpid => {
        if(confirm('¿Desea publicar este proyecto?')){
            modal.find('.modal-title').html('Publicación')
            modal.find('#modal_content').html('<h4 class="text-center">Publicando <span class="fa fa-refresh fa-spin"></span></h4>');
            modal.modal('show');
            $.post('/validate-process/publish/' + cpid, req => {
                modal.modal('hide');
                search();
                alert(req.message);
            }).fail(req => {
                alert(req.responseJSON.message);
                modal.modal('hide');
            });
        }
    }

    let generateRowHtml = rec => {
        return `<tr>
                <td>${rec.id}</td>
                <td>${rec.ocid || ''}</td>
                <td>${rec.publisher || ''}</td>
                <td>${rec.title || ''}</td>
                <td>
                    ${(rec.updated ? '<label class="label label-info">No publicado</label>' : '')}
                    ${(rec.published ? '<label class="label label-success">Actualizado</label>' : '')}
                    ${(rec.valid ? '<label class="label label-success">Correcto</label>' : '<label class="label label-danger">Desactualizado</label>')}
                </td>
                <td>${rec.date_published || ''}</td>
                <td>${rec.updated_date || ''}</td>
                <td class="text-center">
                    <div class="btn-group" style="width:200px">
                        <button class="btn btn-primary" type="button" data-edit>Editar</button>
                        ${(rec.valid && (!rec.published || rec.updated) ? '<button class="btn btn-primary" type="button" data-publish>Publicar</button>' : '')}                        
                    </div>
                </td>
            </tr>`;
    }

    modalAdmin.on('submit', '#frmSearchValidations', function(e) {
        e.preventDefault();
        search();
    });

    modalAdmin.on('click', '[data-json]', function () {
        $.get('/validate-process/json/' + $(this).data('json'), json => {
            modal.find('.modal-title').html('JSON')
            modal.find('#modal_content').html('<pre>' + syntaxHighlight(JSON.stringify(json, undefined ,4)) + '</pre>');
            modal.modal('show');
        });
       
    });

    modal.off('hide.bs.modal');
    modal.on('hide.bs.modal', function () {
        modal.find('.modal-dialog').css('width', '');
     });

     modalAdmin.off('hide.bs.modal');
     modalAdmin.on('hide.bs.modal', function () {
        modalAdmin.find('.modal-dialog').css('width', '');
      });

   
    let validateProcess = (cpid) => {
        if(confirm('¿Desea validar este proyecto?')){
            
            modal.find('.modal-title').html('Resultado')
            modal.find('#modal_content').html('<h4 class="text-center">Validando <span class="fa fa-refresh fa-spin"></span></h4>');
            modal.modal('show');
            $.post('/validate-process/validate/' + cpid, req => {
                modal.find('.modal-title').html('Resultado');
                modal.find('.modal-dialog').css('width', '80%');
                modal.find('#modal_content').html(req);
                modal.find("td:containsNC('El documento aún no se ha publicado'),td:containsNC('No registrado')").addClass('danger');
                modal.find("td:containsNC('Registrado'), td:containsNC('El documento se encuentra público')").addClass('success');
                
                search();
            }).fail(req => {
                alert(req.responseJSON.message);
                modal.modal('hide');
            });
        }
    }
    

    // se genera json en esp    
    let displayJson = (cpid, data) => {    
        modal.find('#modal_content').html('<pre>' + syntaxHighlight(JSON.stringify(data, undefined ,4)) + '</pre>');

        // ir al error
        modal.find('a[data-key]').click(function() {
            // TODO: Posicionar en main el campo que se dio clic.
            // Demasiado complicado con el html dinámico y lo mal implementado en main.js
            //localStorage['goto'] = JSON.stringify(options);
            location = '/main/' + parseInt(cpid);
        });
    }
  

    let generarteJson = (obj, parent) => {
        let json = {};
        
        if(obj.hasOwnProperty('error') && obj.hasOwnProperty('valor')){
            // final de recorrido
            return {error: obj.error, valor: obj.valor};
        } else if(Array.isArray(obj)){
            json = [];
            obj.map(x => json.push(generarteJson(x, parent)));
        } else if(typeof obj === 'object') {
            let keys = Object.keys(obj);
            for(let i=0, key=keys[i], current=obj[key]; i < keys.length; i++, key=keys[i],  current=obj[key]){
                if(key === 'info') continue;
                json[current.label] = generarteJson(current, key);
            }
        } else {
            json = obj;
        }
        return json;
    }
    
    let syntaxHighlight = json => {      
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    search();
})();


(function() {
    jQuery.expr[':'].containsNC =  function(elem, index, match) {
        return (elem.textContent || elem.innerText || jQuery(elem).text() || '').toLowerCase().indexOf((match[3] || '').toLowerCase()) >= 0;
    }
}(jQuery));